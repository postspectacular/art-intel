import type { CommandCtx } from "@thi.ng/args";
import { readJSON } from "@thi.ng/file-io";
import { join } from "node:path";

export const PKG = readJSON(join(process.argv[2], "package.json"));

export interface CommonOpts {
	verbose: boolean;
	quiet: boolean;
}

export interface AppCtx<T extends CommonOpts>
	extends CommandCtx<T, CommonOpts> {}

export const HEADER = `
█████   │ 
█████   │ ${PKG.name} v${PKG.version}
███████ │ ${PKG.description}`;
