import { deepMerge, merge } from "../utils/index";

describe("utils", () => {
  describe("deepMerge", () => {
    it("should merge objects deeply", () => {
      const target = {
        a: {
          b: 1,
          c: 2,
        },
        d: [1, 2, 3],
        e: "hello",
      };
      const source = {
        a: {
          c: 3,
        },
        b: 2,
        d: [4, 5, 6],
        e: undefined,
        f: {
          g: 1,
          h: {
            i: 1,
          },
        },
      };
      const source1 = {
        f: {
          g: () => {},
          h: {
            i: null,
          },
        },
      };
      const result = deepMerge(target, source as any, source1 as any);
      expect(result).toEqual({
        a: {
          b: 1,
          c: 3,
        },
        b: 2,
        d: [4, 5, 6],
        e: undefined,
        f: {
          g: expect.any(Function),
          h: {
            i: null,
          },
        },
      });
      // expect(typeof result.f.g).toBe("function");

      // 验证原始对象未被修改
      expect(target.a.c).toBe(2);
      expect(target.d).toEqual([1, 2, 3]);
    });
  });
  // 额外验证函数类型

  // describe("merge", () => {
  //   it("should merge objects deeply", () => {
  //     const target = {
  //       a: {
  //         b: 1,
  //         c: 2,
  //       },
  //       d: [1, 2, 3],
  //       e: "hello",
  //     };
  //     const source = {
  //       a: {
  //         c: 3,
  //       },
  //       b: 2,
  //       d: [4, 5, 6],
  //       e: undefined,
  //       f: {
  //         g: 1,
  //         h: {
  //           i: 1,
  //         },
  //       },
  //     };
  //     const result = merge(target, source as any);
  //     expect(result).toEqual({
  //       a: {
  //         b: 1,
  //         c: 3,
  //       },
  //       b: 2,
  //       d: [4, 5, 6],
  //       e: undefined,
  //       f: {
  //         g: 1,
  //         h: {
  //           i: 1,
  //         },
  //       },
  //     });
  //   });
  // });
});
