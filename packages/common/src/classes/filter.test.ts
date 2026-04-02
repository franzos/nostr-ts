import { NFilters, NEVENT_KIND } from "..";

test("NFilters can be constructed with a search field", () => {
  const filters = new NFilters({
    search: "nostr protocol",
  });
  expect(filters.search).toEqual("nostr protocol");
});

test("NFilters search field is included in toObj output", () => {
  const filters = new NFilters({
    search: "nostr protocol",
  });
  const obj = filters.toObj();
  expect(obj.search).toEqual("nostr protocol");
});

test("NFilters search can be combined with other filters", () => {
  const filters = new NFilters({
    kinds: [NEVENT_KIND.SHORT_TEXT_NOTE, NEVENT_KIND.LONG_FORM_CONTENT],
    search: "nostr protocol",
    limit: 20,
  });
  const obj = filters.toObj();
  expect(obj.search).toEqual("nostr protocol");
  expect(obj.kinds).toEqual([
    NEVENT_KIND.SHORT_TEXT_NOTE,
    NEVENT_KIND.LONG_FORM_CONTENT,
  ]);
  expect(obj.limit).toEqual(20);
});

test("NFilters updateSearch sets the search field", () => {
  const filters = new NFilters({
    kinds: [NEVENT_KIND.SHORT_TEXT_NOTE],
  });
  expect(filters.search).toBeUndefined();
  filters.updateSearch("bitcoin");
  expect(filters.search).toEqual("bitcoin");
});

test("NFilters without search field omits it from toObj output", () => {
  const filters = new NFilters({
    kinds: [NEVENT_KIND.SHORT_TEXT_NOTE],
    limit: 10,
  });
  const obj = filters.toObj();
  expect(obj.search).toBeUndefined();
  expect(obj.kinds).toEqual([NEVENT_KIND.SHORT_TEXT_NOTE]);
});
