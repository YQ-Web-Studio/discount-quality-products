import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("WordPress Lean Instant-Search Snippet (004-instant-search-endpoint.php)", () => {
  const snippetPath = path.resolve(
    process.cwd(),
    "backend/wordpress/snippets/004-instant-search-endpoint.php"
  );

  it("exists and defines standard snippet header comments", () => {
    expect(fs.existsSync(snippetPath)).toBe(true);
    const content = fs.readFileSync(snippetPath, "utf-8");

    expect(content).toContain("Snippet Name: Lean Instant Product & Category Search REST Endpoint");
    expect(content).toContain("Scope: global");
    expect(content).toContain("ABSPATH");
  });

  it("registers GET /wp-json/dqp/v1/instant-search with public access", () => {
    const content = fs.readFileSync(snippetPath, "utf-8");

    expect(content).toContain("register_rest_route");
    expect(content).toContain("'dqp/v1'");
    expect(content).toContain("'/instant-search'");
    expect(content).toContain("'methods' => 'GET'");
    expect(content).toContain("__return_true");
  });

  it("includes sanitization, SQL safety, and performance constraints", () => {
    const content = fs.readFileSync(snippetPath, "utf-8");

    // Must sanitize query parameter
    expect(content).toContain("sanitize_text_field");
    // Must enforce limits to avoid heavy queries
    expect(content).toContain("$limit");
    // Must use $wpdb->prepare for SQL injection protection
    expect(content).toContain("$wpdb->prepare");
    // Must target publish products and exclude non-visible items
    expect(content).toContain("post_status = 'publish'");
    expect(content).toContain("product");
  });

  it("returns lightweight product card payload including thumbnail and category terms", () => {
    const content = fs.readFileSync(snippetPath, "utf-8");

    expect(content).toContain("'products'");
    expect(content).toContain("'categories'");
    expect(content).toContain("imageUrl");
    expect(content).toContain("price");
    expect(content).toContain("slug");
  });
});
