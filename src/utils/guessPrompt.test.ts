import { guessBoxesBatchPrompt } from "./constants";

describe("guessBoxesBatchPrompt", () => {
  test("names every image in order so entries can be matched back", () => {
    const prompt = guessBoxesBatchPrompt(["Eiffel Tower", "Giant Panda"]);
    expect(prompt).toContain('Image 1 shows "Eiffel Tower"');
    expect(prompt).toContain('Image 2 shows "Giant Panda"');
    expect(prompt).toContain("Return exactly 2 entries");
  });

  test("reads correctly for a single image", () => {
    const prompt = guessBoxesBatchPrompt(["Colosseum"]);
    expect(prompt).toContain("You are given 1 image.");
    expect(prompt).not.toContain("1 images");
    // The cross-image warning is meaningless with one picture.
    expect(prompt).not.toContain("never mix");
  });
});
