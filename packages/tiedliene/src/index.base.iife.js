import { iife } from "../../../helpers/iife.js";

import { applyDiff, determineDiff, revertDiff } from "./library/diff.js";

iife(["tiedliene"], {
	determineDiff,
	applyDiff,
	revertDiff,
});
