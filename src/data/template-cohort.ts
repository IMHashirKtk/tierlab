/** Scope verified against saved public rosters on 2 November 2026. Not a ranking or demand forecast. */
export const TEMPLATE_COHORT = ["valorant-agents", "pokemon-starters", "fast-food-restaurants"];
export const COHORT_REVIEW: Record<string, { updated: string; note: string; source?: string }> = {
  "valorant-agents": {
    updated: "2026-11-02",
    note: "This saved selection contains 29 agent cards. It excludes Hush, who was listed in Riot’s official agent directory when checked on 2 November 2026, so it is not the current complete agent roster. Add a missing agent to your own board if your comparison requires one; no live balance or match statistics are supplied.",
    source: "https://playvalorant.com/en-us/agents/",
  },
  "pokemon-starters": {
    updated: "2026-11-02",
    note: "This selection has 27 named starter cards, including Bulbasaur, Rowlet, Sprigatito, Fuecoco and Quaxly. Pikachu and Eevee are not included, and evolved or regional forms are not separate entries. Decide whether a card represents the named Pokémon alone or its evolution line before ranking; this is not a list of every possible first partner in every game.",
  },
  "fast-food-restaurants": {
    updated: "2026-11-02",
    note: "These 40 chain and brand cards include burger, chicken, pizza, sandwich, coffee and dessert choices, such as McDonalds, KFC, Dominos, Subway, Starbucks and Baskin-Robbins. This is a selected chain roster, not a local restaurant directory or complete coverage of any country. State which market and locations you tried; leave unavailable or unfamiliar chains unranked.",
  },
};
