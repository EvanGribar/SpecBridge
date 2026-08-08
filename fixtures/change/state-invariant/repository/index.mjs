export class Workspace {
  constructor(plan = "starter") {
    this.plan = plan;
    this.members = ["owner@example.com"];
    this.usageCount = 1;
  }

  invite(email) {
    // Seeded bug: increments usageCount before checking limit!
    this.usageCount++;
    if (this.plan === "starter" && this.members.length >= 5) {
      return { success: false, error: "Seat limit reached" };
    }
    this.members.push(email);
    return { success: true };
  }
}
