export function generateBuildingCode(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toLowerCase();
}
