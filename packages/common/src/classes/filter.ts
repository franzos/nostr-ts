import { FiltersBase, NEVENT_KIND } from "../types";

export class NFilters implements FiltersBase {
  ids?: string[] | undefined;
  authors?: string[] | undefined;
  kinds?: number[] | undefined;
  "#e"?: string[] | undefined;
  "#p"?: string[] | undefined;
  since?: number | undefined;
  until?: number | undefined;
  limit?: number | undefined;

  constructor(data?: FiltersBase) {
    this.ids = data?.ids;
    this.authors = data?.authors;
    this.kinds = data?.kinds;
    this["#e"] = data?.["#e"];
    this["#p"] = data?.["#p"];
    this.since = data?.since;
    this.until = data?.until;
    this.limit = data?.limit;
  }

  public addId(id: string) {
    if (!this.ids) {
      this.ids = [];
    }
    this.ids.push(id);
  }

  public addAuthor(author: string) {
    if (!this.authors) {
      this.authors = [];
    }
    this.authors.push(author);
  }

  public addKind(kind: NEVENT_KIND | number) {
    if (!this.kinds) {
      this.kinds = [];
    }
    this.kinds.push(kind);
  }

  public toJson() {
    return JSON.parse(JSON.stringify(this));
  }
}
