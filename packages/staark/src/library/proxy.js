// Targets of the proxies created by proxify, so proxies are recognised and not wrapped again when passed back in.
const targets = new WeakMap();

/**
 * Checks whether the value is a proxy. Proxies created by proxify are always recognised. Other proxies are detected because structured cloning rejects a proxy itself but not a plain copy of it. A proxy whose contents can not be cloned is not detected.
 *
 * @param {any} value Value to check.
 * @returns {boolean} Whether the value is a proxy.
 */
export const isProxy = (value) => {
	if (targets.has(value)) {
		return true;
	}
	try {
		structuredClone(value);
		return false;
	} catch {}
	try {
		structuredClone({ ...value });
		return true;
	} catch {
		return false;
	}
};

/**
 * Returns the object wrapped by a proxy created by proxify, or the value itself otherwise. Reading the target directly avoids the cost of going through the proxy.
 *
 * @param {any} value Value to unwrap.
 * @returns {any} The target of the proxy, or the value.
 */
export const toTarget = (value) => targets.get(value) ?? value;

/**
 * Creates a proxy for the given root object to track changes and invoke the onChange callback.
 *
 * @param {Record<string, any>} root - The root object to be proxified.
 * @param {() => void} onChange - The callback function to be invoked on changes.
 * @returns {Record<string, any>} - The proxified root object.
 */
export const proxify = (root, onChange) => {
	const proxies = new WeakMap();
	const handler = {
		/**
		 * Deletes a property from the target object and invokes the onChange callback if the property existed.
		 *
		 * @param {Record<string, any>} target - The target object from which the property will be deleted.
		 * @param {string} key - The key of the property to be deleted.
		 * @returns {boolean} - True if the property was deleted, otherwise false.
		 */
		deleteProperty: (target, key) => {
			if (Object.hasOwn(target, key)) {
				const deleted = Reflect.deleteProperty(target, key);

				if (deleted) {
					onChange();
				}

				return deleted;
			}
			return true;
		},

		/**
		 * Sets a property on the target object and invokes the onChange callback if the value has changed.
		 *
		 * @param {Record<string, any>} target - The target object on which the property will be set.
		 * @param {string} key - The key of the property to be set.
		 * @param {any} value - The value to be set.
		 * @returns {boolean} - True if the property was set, otherwise false.
		 */
		set: (target, key, value, receiver) => {
			const existingValue = target[key];
			if (existingValue !== value) {
				// Add proxy if value is an object.
				if (value && typeof value === "object") {
					value = add(value);
				}
				const set = Reflect.set(target, key, value, receiver);

				// Dispatch set event. If the target is an array and a new item has been pushed then the length has also changed, therefore a more generalizable path will be dispatched.
				if (set) {
					onChange();
				}
				return set;
			}
			return true;
		},
	};

	// Array methods that run on the target instead of through the proxy, where every item they read or move passes through a trap, which is slow for long arrays. The target holds the same proxied items, so the results are the same.
	const methods = Object.create(null);
	/**
	 * Adds wrappers for the given array methods.
	 *
	 * @param {string} names - Names of the array methods, separated by spaces.
	 * @param {number} type - 0 for methods that only read, 1 for methods whose callback receives the array as the third argument, 2 as the fourth argument, and 3 for methods that move items.
	 */
	const wrap = (names, type) => {
		for (const name of names.split(" ")) {
			const method = Array.prototype[name];
			// Only methods the browser supports are wrapped, so feature detection keeps working.
			if (method) {
				methods[name] = function (...args) {
					const target = toTarget(this);
					if (proxies.get(target) !== this) {
						return method.apply(this, args);
					}
					const callback = args[0];
					if (type === 3) {
						for (let index = 0; index < args.length; index++) {
							if (args[index] && typeof args[index] === "object") {
								args[index] = add(args[index]);
							}
						}
						const before = target.slice();
						const result = method.apply(target, args);
						// Only report a change when an item or the length changed, the same as the set trap.
						if (
							before.length !== target.length ||
							before.some((value, index) => value !== target[index])
						) {
							onChange();
						}
						return result === target ? this : result;
					}
					if (type && typeof callback === "function") {
						const proxy = this;
						// Callbacks receive the proxy as the array, so changes made through it are tracked.
						args[0] = function (a, b, c) {
							return type === 1
								? callback.call(this, a, b, proxy)
								: callback(a, b, c, proxy);
						};
					}
					return method.apply(target, args);
				};
			}
		}
	};
	wrap("includes indexOf join slice toReversed toSorted values", 0);
	wrap(
		"every filter find findIndex findLast findLastIndex flatMap forEach map some",
		1,
	);
	wrap("reduce reduceRight", 2);
	wrap("copyWithin fill reverse shift sort splice unshift", 3);
	methods[Symbol.iterator] = methods.values;
	const arrayHandler = {
		...handler,
		get: (target, key, receiver) =>
			methods[key] ?? Reflect.get(target, key, receiver),
	};

	/**
	 * Recursively creates proxies for each property of the target object to track changes.
	 *
	 * @param {Record<string, any>} target - The object to be proxified.
	 * @returns {Record<string, any>} - The proxified object.
	 */
	const add = (target) => {
		let proxy = proxies.get(toTarget(target));
		if (proxy) {
			return proxy;
		}
		const prototype = Object.getPrototypeOf(target);
		if (
			!Array.isArray(target) &&
			prototype !== Object.prototype &&
			prototype !== null
		) {
			return target;
		}

		proxy = new Proxy(target, Array.isArray(target) ? arrayHandler : handler);
		proxies.set(target, proxy);
		targets.set(proxy, target);
		// Recursively create proxies for each property.
		for (const key of Object.keys(target)) {
			if (target[key] && typeof target[key] === "object") {
				target[key] = add(target[key]);
			}
		}

		return proxy;
	};

	return add(root);
};
