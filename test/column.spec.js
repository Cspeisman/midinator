const {renderColumns} = require("../src/columns");

describe("column", () => {
  it("should do a thing", () => {
    result = renderColumns([2, 3]);
    expect(result[0].sx).toEqual(40);
    expect(result[0].sy).toEqual(0);
    expect(result[0].columnWidth).toEqual(40)
    expect(result[0].columnHeight).toEqual(360)
    expect(result[0].dx).toEqual(40)
    expect(result[0].dy).toEqual(0)
    expect(result[1].sx).toEqual(80);
    expect(result[1].sy).toEqual(0);
    expect(result[1].columnWidth).toEqual(40)
    expect(result[1].columnHeight).toEqual(360)
    expect(result[1].dx).toEqual(80)
    expect(result[1].dy).toEqual(0)
  });
});