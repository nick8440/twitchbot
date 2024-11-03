export function getExpirationDate(secondsUntilExpiration: number) {
  const currentDate = new Date();
  const expirationDate = new Date(
    currentDate.getTime() + secondsUntilExpiration * 1000
  );
  return expirationDate;
}

export function isAfterTomorrow(date: Date) {
  const now = new Date();

  // Calculate the threshold for "after tomorrow" by adding 48 hours
  const afterTomorrow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  // Check if the provided date is after this threshold
  return date > afterTomorrow;
}
