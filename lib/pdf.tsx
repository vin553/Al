import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import type { Vendor } from "./vendor-types";
import {
  medianPackagePriceSgd,
  minPackageSgd,
  minPerPaxSgd,
  serviceBreadthScore,
} from "./vendor-types";
import type { Swot } from "./swot";

const colors = {
  text: "#0f0f10",
  muted: "#6b7280",
  border: "#e5e7eb",
  accent: "#1d4ed8",
  emerald: "#059669",
  amber: "#b45309",
  sky: "#0369a1",
  rose: "#b91c1c",
};

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: "Helvetica", color: colors.text, fontSize: 10 },
  h1: { fontSize: 20, fontWeight: "bold", marginBottom: 4 },
  h2: { fontSize: 13, fontWeight: "bold", marginTop: 16, marginBottom: 8 },
  eyebrow: { fontSize: 8, color: colors.muted, textTransform: "uppercase", letterSpacing: 1.2 },
  para: { fontSize: 10, color: colors.muted, lineHeight: 1.4 },
  hr: { borderBottomWidth: 1, borderColor: colors.border, marginVertical: 10 },
  row: { flexDirection: "row" },
  cell: { fontSize: 9 },
  tableHead: { flexDirection: "row", borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: colors.border, paddingVertical: 4 },
  tableCellHead: { fontSize: 8, color: colors.muted, textTransform: "uppercase", letterSpacing: 1 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  kpi: {
    width: "23.5%",
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
  },
  kpiLabel: { fontSize: 7, color: colors.muted, textTransform: "uppercase", letterSpacing: 1 },
  kpiValue: { fontSize: 14, fontWeight: "bold", marginTop: 4 },
  swotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  swotCard: {
    width: "48.5%",
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
  },
  swotLabel: { fontSize: 9, fontWeight: "bold", marginBottom: 4 },
  bullet: { fontSize: 9, marginBottom: 3, paddingLeft: 6 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 8,
    color: colors.muted,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

function Footer() {
  return (
    <Text style={styles.footer} fixed>
      <Text>SG Wedding Intel · Singapore Indian Luxury Wedding Market</Text>
      <Text
        render={({ pageNumber, totalPages }) => `p. ${pageNumber} / ${totalPages}`}
      />
    </Text>
  );
}

export function CompareDoc({ vendors }: { vendors: Vendor[] }) {
  const totalIg = vendors.reduce((s, v) => s + v.instagramFollowers, 0);
  const avgRating = vendors.reduce((s, v) => s + v.googleRating, 0) / vendors.length;

  return (
    <Document
      title="SG Wedding Intel — Competitor Matrix"
      author="SG Wedding Intel"
      subject="Competitor comparison"
    >
      <Page size="A4" style={styles.page} orientation="landscape">
        <Text style={styles.eyebrow}>Market intelligence · Singapore · Indian weddings</Text>
        <Text style={styles.h1}>Competitor matrix</Text>
        <Text style={styles.para}>
          Pricing, rating, reach and breadth across {vendors.length} vendors. Generated{" "}
          {new Date().toLocaleString("en-SG")}.
        </Text>

        <View style={styles.kpiGrid}>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Vendors</Text>
            <Text style={styles.kpiValue}>{vendors.length}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Avg rating</Text>
            <Text style={styles.kpiValue}>{avgRating.toFixed(2)}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Aggregate IG</Text>
            <Text style={styles.kpiValue}>{(totalIg / 1000).toFixed(1)}k</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Avg breadth</Text>
            <Text style={styles.kpiValue}>
              {(
                vendors.reduce((s, v) => s + serviceBreadthScore(v), 0) / vendors.length
              ).toFixed(1)}
            </Text>
          </View>
        </View>

        <Text style={styles.h2}>Vendor-by-vendor comparison</Text>
        <View style={styles.tableHead}>
          <Text style={[styles.tableCellHead, { width: "22%" }]}>Vendor</Text>
          <Text style={[styles.tableCellHead, { width: "8%" }]}>Founded</Text>
          <Text style={[styles.tableCellHead, { width: "8%" }]}>Rating</Text>
          <Text style={[styles.tableCellHead, { width: "8%" }]}>Reviews</Text>
          <Text style={[styles.tableCellHead, { width: "10%" }]}>IG</Text>
          <Text style={[styles.tableCellHead, { width: "10%" }]}>Breadth</Text>
          <Text style={[styles.tableCellHead, { width: "12%" }]}>Entry /pax</Text>
          <Text style={[styles.tableCellHead, { width: "12%" }]}>Min pkg</Text>
          <Text style={[styles.tableCellHead, { width: "10%" }]}>Median</Text>
        </View>
        {vendors.map((v) => {
          const entry = minPerPaxSgd(v);
          const minPkg = minPackageSgd(v);
          const median = medianPackagePriceSgd(v);
          return (
            <View key={v.slug} style={styles.tableRow}>
              <Text style={[styles.cell, { width: "22%" }]}>{v.name}</Text>
              <Text style={[styles.cell, { width: "8%" }]}>{v.foundedYear ?? "—"}</Text>
              <Text style={[styles.cell, { width: "8%" }]}>{v.googleRating.toFixed(1)}</Text>
              <Text style={[styles.cell, { width: "8%" }]}>{v.googleReviews}</Text>
              <Text style={[styles.cell, { width: "10%" }]}>
                {v.instagramFollowers.toLocaleString()}
              </Text>
              <Text style={[styles.cell, { width: "10%" }]}>{serviceBreadthScore(v).toFixed(1)}</Text>
              <Text style={[styles.cell, { width: "12%" }]}>
                {entry ? `S$${entry}` : "—"}
              </Text>
              <Text style={[styles.cell, { width: "12%" }]}>
                {minPkg ? `S$${Math.round(minPkg)}` : "—"}
              </Text>
              <Text style={[styles.cell, { width: "10%" }]}>
                S${Math.round(median).toLocaleString()}
              </Text>
            </View>
          );
        })}

        <Footer />
      </Page>
    </Document>
  );
}

export function VendorDoc({ vendor, swot }: { vendor: Vendor; swot: Swot }) {
  const entry = minPerPaxSgd(vendor);
  const minPkg = minPackageSgd(vendor);
  const median = medianPackagePriceSgd(vendor);
  const breadth = serviceBreadthScore(vendor);

  return (
    <Document title={`${vendor.name} — SG Wedding Intel`} author="SG Wedding Intel">
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrow}>Vendor dossier · {vendor.dataConfidence} data</Text>
        <Text style={styles.h1}>{vendor.name}</Text>
        <Text style={styles.para}>{vendor.tagline}</Text>

        <View style={styles.kpiGrid}>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Google rating</Text>
            <Text style={styles.kpiValue}>{vendor.googleRating.toFixed(1)}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Instagram</Text>
            <Text style={styles.kpiValue}>
              {(vendor.instagramFollowers / 1000).toFixed(1)}k
            </Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Breadth</Text>
            <Text style={styles.kpiValue}>{breadth.toFixed(1)}/10</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Median spend</Text>
            <Text style={styles.kpiValue}>S${Math.round(median).toLocaleString()}</Text>
          </View>
        </View>

        <Text style={styles.h2}>Pricing tiers</Text>
        <View style={styles.tableHead}>
          <Text style={[styles.tableCellHead, { width: "15%" }]}>Tier</Text>
          <Text style={[styles.tableCellHead, { width: "45%" }]}>Package</Text>
          <Text style={[styles.tableCellHead, { width: "20%" }]}>Per pax</Text>
          <Text style={[styles.tableCellHead, { width: "20%" }]}>Package SGD</Text>
        </View>
        {vendor.pricing.map((p, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={[styles.cell, { width: "15%" }]}>{p.tier}</Text>
            <Text style={[styles.cell, { width: "45%" }]}>{p.label}</Text>
            <Text style={[styles.cell, { width: "20%" }]}>
              {p.perPaxSgd ? `S$${p.perPaxSgd[0]}–${p.perPaxSgd[1]}` : "—"}
            </Text>
            <Text style={[styles.cell, { width: "20%" }]}>
              {p.packageSgd ? `S$${p.packageSgd[0]}–${p.packageSgd[1]}` : "—"}
            </Text>
          </View>
        ))}

        <Text style={styles.h2}>SWOT</Text>
        <Text style={[styles.para, { marginBottom: 4 }]}>
          Source: {swot.provider}
          {swot.model ? ` (${swot.model})` : ""} · generated{" "}
          {new Date(swot.generatedAt).toLocaleString("en-SG")}
        </Text>
        <View style={styles.swotGrid}>
          {(["strengths", "weaknesses", "opportunities", "threats"] as const).map((key) => (
            <View key={key} style={styles.swotCard}>
              <Text
                style={[
                  styles.swotLabel,
                  {
                    color:
                      key === "strengths"
                        ? colors.emerald
                        : key === "weaknesses"
                          ? colors.amber
                          : key === "opportunities"
                            ? colors.sky
                            : colors.rose,
                  },
                ]}
              >
                {key.toUpperCase()}
              </Text>
              {swot[key].map((b, i) => (
                <Text key={i} style={styles.bullet}>
                  • {b}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <Text style={styles.h2}>Sources</Text>
        {vendor.sources.map((s, i) => (
          <Text key={i} style={[styles.bullet, { color: colors.accent }]}>
            • {s.note} — {s.url}
          </Text>
        ))}

        <Footer />
      </Page>
    </Document>
  );
}

export async function renderPdf(element: React.ReactElement): Promise<Buffer> {
  return renderToBuffer(element);
}
