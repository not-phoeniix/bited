import { exec } from "ags/process";

export const getEnv = (env: string) => exec(`bash -c 'echo $${env}'`);
export const makePath = (...paths: string[]) => paths.join("/").replaceAll(/\/+/g, "/");

const APP_DIR_NAME = "bited";
const HOME = getEnv("HOME");
const XDG_CONFIG_HOME = getEnv("XDG_CONFIG_HOME") || makePath(HOME, ".config");
const XDG_CACHE_DIR = getEnv("XDG_CACHE_HOME") || makePath(HOME, ".cache");
const APP_CONFIG_DIR = makePath(XDG_CONFIG_HOME, APP_DIR_NAME);
const APP_CACHE_DIR = makePath(XDG_CACHE_DIR, APP_DIR_NAME);
const APP_CACHE_PREV_THEME_FILE = makePath(APP_CACHE_DIR, "theme");
const APP_RUNTIME_DIR = makePath("/tmp", APP_DIR_NAME);

export default {
    HOME,
    XDG_CONFIG_HOME,
    XDG_CACHE_DIR,
    APP_DIR_NAME,
    APP_CONFIG_DIR,
    APP_CACHE_DIR,
    APP_CACHE_PREV_THEME_FILE,
};
