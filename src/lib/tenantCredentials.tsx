export function generateTenantCredentials(
  buildingName: string,
  roomNumber: string | number
) {
  // Take only first letters of each word
  const buildingCode = buildingName
    .split(" ")
    .map(word => word[0])
    .join("")
    .toLowerCase();

  const username = `${roomNumber}@${buildingCode}`;
  const password = `pass@${roomNumber}@${buildingCode}`;

  return {
    username,
    password,
    buildingCode,
  };
}
