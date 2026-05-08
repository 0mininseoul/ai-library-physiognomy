import type { LibraryBook } from "./types";

export interface LocationProvider {
  resolve(book: LibraryBook): { callNumber: string; locationLabel: string };
}

export class StaticLocationProvider implements LocationProvider {
  resolve(book: LibraryBook) {
    return {
      callNumber: book.callNumber,
      locationLabel: book.locationLabel,
    };
  }
}
