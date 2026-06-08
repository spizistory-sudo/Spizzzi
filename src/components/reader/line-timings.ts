export interface LineTiming {
  text: string;
  startTime: number;
  endTime: number;
}

export function getLineTimings(pageText: string, audioDuration: number): LineTiming[] {
  const lines = pageText
    .split(/(?<=[.!?])\s+/)
    .map(l => l.trim())
    .filter(Boolean);

  if (lines.length === 0 || audioDuration <= 0) {
    return [{ text: pageText || '', startTime: 0, endTime: audioDuration || 0 }];
  }

  const totalChars = lines.reduce((sum, l) => sum + l.length, 0);
  let cursor = 0;

  return lines.map(line => {
    const fraction = totalChars > 0 ? line.length / totalChars : 1 / lines.length;
    const duration = fraction * audioDuration;
    const timing = { text: line, startTime: cursor, endTime: cursor + duration };
    cursor += duration;
    return timing;
  });
}
