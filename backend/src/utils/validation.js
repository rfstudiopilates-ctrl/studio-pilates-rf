export function formatZodValidationError(error) {
  const fields = {};

  for (const issue of error.issues) {
    const fieldKey = issue.path[0]?.toString() || '_form';

    if (fields[fieldKey]) {
      fields[fieldKey] = `${fields[fieldKey]}. ${issue.message}`;
    } else {
      fields[fieldKey] = issue.message;
    }
  }

  return {
    message: 'Revisá los campos marcados.',
    fields,
  };
}
