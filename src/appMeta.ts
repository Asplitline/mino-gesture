import packageJson from "../package.json";

/** 与根目录 `package.json` 的 `version` 同步，供前端展示与分组使用 */
export const APP_VERSION: string = packageJson.version;
