export const unixTimeToRelative = (time: number) => {
  const now = new Date();
  const then = new Date(time * 1000);
  const diff = now.getTime() - then.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) {
    return `${seconds} seconds ago`;
  } else if (minutes < 60) {
    return `${minutes} minutes ago`;
  } else if (hours < 24) {
    return `${hours} hours ago`;
  } else {
    return `${then.toLocaleDateString()} ${then.toLocaleTimeString()}`;
  }
};
