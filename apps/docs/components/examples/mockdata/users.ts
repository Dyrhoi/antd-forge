export const mockUsers = [
    { id: 1, name: "Alice Johnson", email: "alice@example.com", status: "active" },
    { id: 2, name: "Bob Smith", email: "bob@example.com", status: "inactive" },
    { id: 3, name: "Charlie Brown", email: "charlie@example.com", status: "active" },
    { id: 4, name: "Diana Prince", email: "diana@example.com", status: "active" },
    { id: 5, name: "Edward Norton", email: "edward@example.com", status: "inactive" },
    { id: 6, name: "Fiona Green", email: "fiona@example.com", status: "active" },
    { id: 7, name: "George Wilson", email: "george@example.com", status: "active" },
    { id: 8, name: "Hannah Lee", email: "hannah@example.com", status: "inactive" },
    { id: 9, name: "Ivan Petrov", email: "ivan@example.com", status: "active" },
    { id: 10, name: "Julia Chen", email: "julia@example.com", status: "active" },
    { id: 11, name: "Kevin Brown", email: "kevin@example.com", status: "inactive" },
    { id: 12, name: "Laura White", email: "laura@example.com", status: "active" },
] as const;

export type User = (typeof mockUsers)[number];
