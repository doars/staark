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

	/**
	 * Wraps an array method that moves existing items, so it runs on the target instead of through the proxy. Otherwise every moved item passes through the set trap, which is slow for long arrays.
	 *
	 * @param {string} name - Name of the array method.
	 * @param {number} start - Index of the first argument that is an item to insert.
	 * @param {(length: number, args: any[], result: any) => boolean} changed - Whether the call changed the array, given the length before the call.
	 * @returns {Function} - The wrapped method.
	 */
	const wrap = (name, start, changed) =>
		function (...args) {
			const target = toTarget(this);
			// Only wrap calls on arrays that are tracked by this proxify call.
			if (proxies.get(target) !== this) {
				return Array.prototype[name].apply(this, args);
			}
			for (let index = start; index < args.length; index++) {
				const value = args[index];
				if (value && typeof value === "object") {
					args[index] = add(value);
				}
			}
			const length = target.length;
			const result = Array.prototype[name].apply(target, args);
			if (changed(length, args, result)) {
				onChange();
			}
			return result === target ? this : result;
		};
	const always = () => true;
	const methods = {
		copyWithin: wrap("copyWithin", Infinity, always),
		fill: wrap("fill", 0, always),
		reverse: wrap("reverse", Infinity, always),
		shift: wrap("shift", Infinity, (length) => length > 0),
		sort: wrap("sort", Infinity, always),
		splice: wrap(
			"splice",
			2,
			(_length, args, result) => result.length > 0 || args.length > 2,
		),
		unshift: wrap("unshift", 0, (_length, args) => args.length > 0),
	};
	const arrayHandler = {
		...handler,
		get: (target, key, receiver) =>
			typeof key === "string" && Object.hasOwn(methods, key)
				? methods[key]
				: Reflect.get(target, key, receiver),
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
