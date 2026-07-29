import { iife } from "../../../helpers/iife.js";
import { applyDiff, determineDiff, revertDiff } from "./library/diff.js";
import { manageState } from "./library/state.js";
import { cloneRecursive } from "./utilities/clone.js";

iife(["tiedliene"], {
	cloneRecursive,

	determineDiff,
	applyDiff,
	revertDiff,

	manageState,
});
