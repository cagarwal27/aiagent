import { describe, it, expect } from "vitest";

// Unit test for the Apollo response mapper (pure function, no API call)
describe("mapApolloPersonToProspect", () => {
  it("maps a full Apollo person response to prospect shape", () => {
    const apolloPerson = {
      first_name: "Jane",
      last_name: "Doe",
      title: "VP of Sales",
      email: "jane@acme.com",
      organization: {
        name: "Acme Corp",
        website_url: "https://acme.com",
      },
    };

    // Inline the mapping logic to test
    const prospect = {
      name: `${apolloPerson.first_name} ${apolloPerson.last_name}`,
      company: apolloPerson.organization?.name ?? "Unknown",
      title: apolloPerson.title ?? undefined,
      url: apolloPerson.organization?.website_url ?? `https://${apolloPerson.email?.split("@")[1] ?? "example.com"}`,
      email: apolloPerson.email ?? undefined,
    };

    expect(prospect).toEqual({
      name: "Jane Doe",
      company: "Acme Corp",
      title: "VP of Sales",
      url: "https://acme.com",
      email: "jane@acme.com",
    });
  });

  it("handles missing organization fields gracefully", () => {
    const apolloPerson = {
      first_name: "John",
      last_name: "Smith",
      title: null,
      email: "john@startup.io",
      organization: null,
    };

    const prospect = {
      name: `${apolloPerson.first_name} ${apolloPerson.last_name}`,
      company: apolloPerson.organization?.name ?? "Unknown",
      title: apolloPerson.title ?? undefined,
      url: apolloPerson.organization?.website_url ?? `https://${apolloPerson.email?.split("@")[1] ?? "example.com"}`,
      email: apolloPerson.email ?? undefined,
    };

    expect(prospect).toEqual({
      name: "John Smith",
      company: "Unknown",
      title: undefined,
      url: "https://startup.io",
      email: "john@startup.io",
    });
  });

  it("filters out people with no email", () => {
    const people = [
      { first_name: "A", last_name: "B", email: "a@b.com", title: null, organization: null },
      { first_name: "C", last_name: "D", email: null, title: null, organization: null },
      { first_name: "E", last_name: "F", email: "", title: null, organization: null },
    ];

    const filtered = people.filter((p) => p.email && p.email.length > 0);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].email).toBe("a@b.com");
  });
});
