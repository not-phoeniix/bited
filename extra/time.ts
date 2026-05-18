import { exec, interval, Variable } from "astal";

export const hour = Variable("0");
export const hourMilit = Variable("0");
export const minute = Variable("0");
export const day = Variable("15");
export const monthName = Variable("November");
export const monthNum = Variable("11");
export const year = Variable("1987");
interval(5_000, () => {
    hour.set(exec("date +%I"));
    hourMilit.set(exec("date +%H"));
    minute.set(exec("date +%M"));
    day.set(exec("date +%d"));
    monthName.set(exec("date +%B"));
    monthNum.set(exec("date +%m"))
    year.set(exec("date +%Y"));
});
