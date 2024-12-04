export function searchBy<T>(collection: T[], fields: (keyof T | ((item: T) => string))[], text: string) {
  return collection.filter((item) =>
    fields.some((field) =>
      String(typeof field === "function" ? field(item) : item[field])
        .toLowerCase()
        .includes(text.toLowerCase())
    )
  );
}
