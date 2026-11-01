import { exec } from "ags/process";

export const getEnv = (env: string) => exec(`bash -c 'echo $${env}'`);
export const makePath = (...paths: string[]) => paths.join("/").replaceAll(/\/+/g, "/");

const APP_DIR_NAME = "bited";
const HOME = getEnv("HOME");
const XDG_CONFIG_HOME = getEnv("XDG_CONFIG_HOME") || makePath(HOME, ".config");
const XDG_CACHE_DIR = getEnv("XDG_CACHE_HOME") || makePath(HOME, ".cache");
const XDG_RUNTIME_DIR =
    getEnv("XDG_RUNTIME_DIR") ||
    makePath("/run/user", exec(`id -u ${getEnv("USER")}`));
const APP_CONFIG_DIR = makePath(XDG_CONFIG_HOME, APP_DIR_NAME);
const APP_CACHE_DIR = makePath(XDG_CACHE_DIR, APP_DIR_NAME);
const APP_CACHE_PREV_THEME_FILE = makePath(APP_CACHE_DIR, "theme");
const APP_RUNTIME_DIR = makePath(XDG_RUNTIME_DIR, APP_DIR_NAME);
const APP_RUNTIME_IN_PIPE_FILE = makePath(APP_RUNTIME_DIR, `${APP_DIR_NAME}_in.fifo`);
const APP_RUNTIME_OUT_PIPE_FILE = makePath(APP_RUNTIME_DIR, `${APP_DIR_NAME}_out.fifo`);

export default {
    APP_DIR_NAME,
    HOME,
    XDG_CONFIG_HOME,
    XDG_CACHE_DIR,
    XDG_RUNTIME_DIR,
    APP_CONFIG_DIR,
    APP_CACHE_DIR,
    APP_CACHE_PREV_THEME_FILE,
    APP_RUNTIME_DIR,
    APP_RUNTIME_IN_PIPE_FILE,
    APP_RUNTIME_OUT_PIPE_FILE,
};
