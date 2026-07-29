import { node } from "@doars/staark-common/src/node.js";
import { iife } from "../../../helpers/iife.js";
import { prepare } from "./library/patch.js";

iife(["staark"], {
	node,
	prepare,
});
