import { describe, expect, it } from "vitest";

describe("Databento API Key Validation", () => {
  it("should have DATABENTO_API_KEY environment variable set", () => {
    const apiKey = process.env.DATABENTO_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe("");
    expect(apiKey?.length).toBeGreaterThan(10);
  });

  it("should validate Databento API key format", () => {
    const apiKey = process.env.DATABENTO_API_KEY;
    // Databento API keys typically start with 'db-'
    expect(apiKey?.startsWith("db-")).toBe(true);
  });

  it("should be able to make a test request to Databento API", async () => {
    const apiKey = process.env.DATABENTO_API_KEY;
    
    if (!apiKey) {
      throw new Error("DATABENTO_API_KEY not set");
    }

    // Test the API key by making a simple metadata request
    // Using the Databento REST API to check available datasets
    const response = await fetch("https://hist.databento.com/v0/metadata.list_datasets", {
      method: "GET",
      headers: {
        "Authorization": `Basic ${Buffer.from(apiKey + ":").toString("base64")}`,
        "Content-Type": "application/json",
      },
    });

    // If the key is valid, we should get a 200 response
    // If invalid, we'll get 401 Unauthorized
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    
    // Check that CME data is available (GLBX.MDP3 is the CME Globex dataset)
    const hasCME = data.some((dataset: string) => dataset.includes("GLBX"));
    expect(hasCME).toBe(true);
  });
});
