export function formatAge(dateOfBirth) {
  if (!dateOfBirth) return null;

  const dob = new Date(dateOfBirth);
  const today = new Date();
  let months = (today.getFullYear() - dob.getFullYear()) * 12 + (today.getMonth() - dob.getMonth());
  if (today.getDate() < dob.getDate()) months -= 1;
  if (months < 0) return null;

  if (months < 24) return `${months} mo`;
  return `${Math.floor(months / 12)} yr`;
}
