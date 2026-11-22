import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const employmentStatusEnum = pgEnum("employment_status", [
  "PNS",
  "PPPK_FULL",
  "PPPK_PART",
]);

export const genderEnum = pgEnum("gender", ["L", "P"]);

export const retirementProcessStatusEnum = pgEnum(
  "retirement_process_status",
  ["BELUM", "BERKAS", "DIAJUKAN", "SELESAI"]
);

export const tmtRuleEnum = pgEnum("tmt_rule", [
  "FIRST_OF_NEXT_MONTH",
  "EXACT_BIRTHDAY",
]);

export const units = pgTable("units", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  sheetAlias: varchar("sheet_alias", { length: 120 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const employees = pgTable(
  "employees",
  {
    id: serial("id").primaryKey(),
    nip: varchar("nip", { length: 18 }).notNull().unique(),
    fullName: varchar("full_name", { length: 180 }).notNull(),
    birthDate: date("birth_date", { mode: "string" }).notNull(),
    gender: genderEnum("gender").notNull(),
    rankGrade: varchar("rank_grade", { length: 32 }).notNull(),
    positionName: varchar("position_name", { length: 200 }).notNull(),
    employmentStatus: employmentStatusEnum("employment_status").notNull(),
    unitId: integer("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "restrict" }),
    bupAge: integer("bup_age").notNull().default(60),
    retirementDate: date("retirement_date", { mode: "string" }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    processStatus: retirementProcessStatusEnum("process_status")
      .notNull()
      .default("BELUM"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("employees_nip_idx").on(table.nip),
    index("employees_full_name_idx").on(table.fullName),
    index("employees_birth_date_idx").on(table.birthDate),
    index("employees_employment_status_idx").on(table.employmentStatus),
    index("employees_unit_id_idx").on(table.unitId),
    index("employees_retirement_date_idx").on(table.retirementDate),
    index("employees_is_active_idx").on(table.isActive),
  ]
);

export const appSettings = pgTable("app_settings", {
  id: integer("id").primaryKey().default(1),
  institutionName: varchar("institution_name", { length: 200 })
    .notNull()
    .default("BADAN RISET DAN INOVASI DAERAH"),
  institutionSubname: varchar("institution_subname", { length: 200 })
    .notNull()
    .default("PROVINSI SUMATERA SELATAN"),
  defaultBupAge: integer("default_bup_age").notNull().default(60),
  tmtRule: tmtRuleEnum("tmt_rule").notNull().default("FIRST_OF_NEXT_MONTH"),
  criticalMonths: integer("critical_months").notNull().default(6),
  warningMonths: integer("warning_months").notNull().default(12),
  upcomingMonths: integer("upcoming_months").notNull().default(24),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const unitsRelations = relations(units, ({ many }) => ({
  employees: many(employees),
}));

export const employeesRelations = relations(employees, ({ one }) => ({
  unit: one(units, {
    fields: [employees.unitId],
    references: [units.id],
  }),
}));

export type Unit = typeof units.$inferSelect;
export type NewUnit = typeof units.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type AppSettings = typeof appSettings.$inferSelect;
export type EmploymentStatus = (typeof employmentStatusEnum.enumValues)[number];
export type Gender = (typeof genderEnum.enumValues)[number];
export type RetirementProcessStatus =
  (typeof retirementProcessStatusEnum.enumValues)[number];
export type TmtRule = (typeof tmtRuleEnum.enumValues)[number];
