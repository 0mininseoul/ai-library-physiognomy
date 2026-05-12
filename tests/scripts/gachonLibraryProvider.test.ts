import { describe, expect, it } from "vitest";
import {
  gachonLibraryItemToCandidate,
  parseGachonLibraryDetailXml,
  parseGachonLibrarySearchResults,
} from "../../scripts/library/gachon-library-provider";

describe("Gachon library provider", () => {
  it("parses catalog search result items and thumbnail calls", () => {
    const html = `
      <li id="item_CATCAZ000007254279" class="items" data-datatype="m">
        <dt class="title">서명</dt>
        <dd class="title"><a href="/search/detail/CATCAZ000007254279?mainLink=/search/caz"><span class="hilight">희랍어</span> 시간 : 한강 장편소설</a><button>상세보기</button></dd>
        <dt class="title">저자</dt>
        <dd class="info">한강</dd>
        <dt class="title">출판사</dt>
        <dd class="info">문학동네</dd>
        <dt class="title">출판년</dt>
        <dd class="info">2019</dd>
      </li>
      <script>callThumbnail('bookImg_CATCAZ000007254279','9788954616515','CAT','000007254279');</script>
    `;

    expect(parseGachonLibrarySearchResults(html, "희랍어 시간")).toEqual([
      {
        itemId: "CATCAZ000007254279",
        controlNo: "000007254279",
        title: "희랍어 시간 : 한강 장편소설",
        authors: ["한강"],
        publisher: "문학동네",
        publishedYear: 2019,
        isbn13: "9788954616515",
        detailUrl: "https://lib.gachon.ac.kr/search/detail/CATCAZ000007254279?mainLink=/search/caz",
        query: "희랍어 시간",
      },
    ]);
  });

  it("builds subject-based detail descriptions from preview XML", () => {
    const detail = parseGachonLibraryDetailXml(`
      <detail>
        <profile><name>ISBN</name><value><![CDATA[9788954616515<br/>]]></value></profile>
        <profile><name>비통제주제어</name><value><![CDATA[
          <a>한국 현대 소설</a>,<a>희랍어</a>,
        ]]></value></profile>
        <profile><name>형태사항</name><value><![CDATA[193 p.;21 cm.]]></value></profile>
      </detail>
    `);

    expect(detail.isbn13).toBe("9788954616515");
    expect(detail.subjects).toEqual(["한국 현대 소설", "희랍어"]);
    expect(detail.description).toContain("가천대학교 중앙도서관 주제어: 한국 현대 소설, 희랍어");
  });

  it("converts catalog metadata into a metadata candidate", () => {
    const candidate = gachonLibraryItemToCandidate(
      {
        itemId: "CATCAZ000007254279",
        controlNo: "000007254279",
        title: "희랍어 시간 : 한강 장편소설",
        authors: ["한강"],
        publisher: "문학동네",
        publishedYear: 2019,
        isbn13: "9788954616515",
        detailUrl: "https://lib.gachon.ac.kr/search/detail/CATCAZ000007254279",
        query: "희랍어 시간",
      },
      {
        isbn13: "9788954616515",
        subjects: ["한국 현대 소설"],
        description: "가천대학교 중앙도서관 주제어: 한국 현대 소설",
      },
      {
        largeUrl: "https://bookthumb.example/cover.jpg",
        provider: "DB",
      },
    );

    expect(candidate).toMatchObject({
      provider: "gachon_library",
      isbn13: "9788954616515",
      coverUrl: "https://bookthumb.example/cover.jpg",
      description: "가천대학교 중앙도서관 주제어: 한국 현대 소설",
    });
  });
});
