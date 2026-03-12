type NullableString = string | null | undefined;

type NameLike = {
  first_name?: NullableString;
  last_name?: NullableString;
  firstName?: NullableString;
  lastName?: NullableString;
  full_name?: NullableString;
  fullName?: NullableString;
  student_name?: NullableString;
  student_full_name?: NullableString;
  coach_first_name?: NullableString;
  coach_last_name?: NullableString;
  student?: {
    first_name?: NullableString;
    last_name?: NullableString;
    firstName?: NullableString;
    lastName?: NullableString;
    full_name?: NullableString;
    fullName?: NullableString;
  } | null;
} | null | undefined;

const normalizePart = (value?: NullableString) => value?.toString().trim() || "";

export const formatNameParts = (
  lastName?: NullableString,
  firstName?: NullableString,
  middleName?: NullableString,
) =>
  [normalizePart(lastName), normalizePart(firstName), normalizePart(middleName)]
    .filter(Boolean)
    .join(" ");

export const formatFullName = (fullName?: NullableString) => {
  const normalized = normalizePart(fullName).replace(/\s+/g, " ");

  if (
    !normalized ||
    normalized.startsWith("#") ||
    normalized.toUpperCase().startsWith("ID:")
  ) {
    return normalized;
  }

  const parts = normalized.split(" ").filter(Boolean);

  if (parts.length < 2) {
    return normalized;
  }

  const [firstPart, ...restParts] = parts;
  return [...restParts, firstPart].join(" ");
};

export const formatPersonName = (person: NameLike) => {
  if (!person) return "";

  const firstName =
    person.first_name ||
    person.firstName ||
    person.student?.first_name ||
    person.student?.firstName ||
    person.coach_first_name;
  const lastName =
    person.last_name ||
    person.lastName ||
    person.student?.last_name ||
    person.student?.lastName ||
    person.coach_last_name;

  if (firstName || lastName) {
    return formatNameParts(lastName, firstName);
  }

  return formatFullName(
    person.full_name ||
      person.fullName ||
      person.student_name ||
      person.student_full_name ||
      person.student?.full_name ||
      person.student?.fullName,
  );
};
