export function duration(time_string: string): number {
  let offset = 0;
  let pow = 0;
  for (const item of time_string.split(":").reverse()) {
    offset += parseInt(item, 10) * 60 ** pow;
    pow++;
  }
  return offset;
}
