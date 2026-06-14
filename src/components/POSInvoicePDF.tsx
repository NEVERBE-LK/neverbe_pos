"use client";

import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { Order } from "@/model/Order";

interface InvoicePDFProps {
  order: Order;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Courier-Bold",
    fontSize: 7,
    paddingHorizontal: 4,
    paddingVertical: 4,
    color: "#000",
  },
  header: { textAlign: "center", marginBottom: 4 },
  hr: { borderBottomWidth: 0.5, borderColor: "#000", marginVertical: 2 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderColor: "#000",
    paddingBottom: 1,
    marginBottom: 1,
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 1,
  },
  left: { flex: 3 },
  right: { flex: 1, textAlign: "right" },
  textCenter: { textAlign: "center" },
});

const POSInvoicePDF: React.FC<InvoicePDFProps> = ({ order }) => {
  if (!order?.items?.length) {
    return (
      <Document>
        <Page style={styles.page}>
          <Text>No Order Data</Text>
        </Page>
      </Document>
    );
  }

  // Raw subtotal BEFORE discounts
  const rawSubtotal = order.items.reduce(
    (acc, i) => acc + i.price * i.quantity,
    0
  );

  // Total of per-item discounts
  const itemDiscountTotal = order.items.reduce(
    (acc, i) => acc + (i.discount || 0) * i.quantity,
    0
  );

  return (
    <Document>
      <Page size={{ width: "48mm", height: "274mm" }} style={styles.page}>
        <View style={styles.header}>
          <Text style={{ fontSize: 9, fontWeight: "bold" }}>Neverbe</Text>
          <Text style={{ fontSize: 7 }}>330/4/10 New Kandy Road</Text>
          <Text style={{ fontSize: 7 }}>Delgoda</Text>
          <Text style={{ fontSize: 7 }}>+94 70 520 8999</Text>
          <Text style={{ fontSize: 7 }}>+94 72 924 9999</Text>
          <Text style={{ fontSize: 7 }}>info@neverbe.lk</Text>
        </View>

        <View style={styles.hr} />

        {/* Order Info */}
        <Text style={[styles.textCenter, { marginBottom: 4, fontSize: 8 }]}>
          Order ID: {order.orderId.toUpperCase()}
        </Text>
        <Text style={[styles.textCenter, { marginBottom: 4, fontSize: 7 }]}>
          {new Date(order.createdAt as any).toLocaleString()}
        </Text>

        {/* Items List */}
        <View>
          <View style={styles.hr} />
          {order.items.map((item: any, idx: number) => {
            const hasDiscount = (item.discount || 0) > 0;
            const netPrice = item.price - (item.discount || 0);
            return (
            <View key={idx} style={{ marginBottom: 3 }}>
              <View style={styles.tableRow}>
                <View style={styles.left}>
                  <Text style={{ fontSize: 7 }}>
                    {item.quantity} x {item.name}
                  </Text>
                  {item.variantName && (
                    <Text style={{ fontSize: 6, color: "#666" }}>
                      {item.variantName} | {item.size}
                    </Text>
                  )}
                  <Text style={{ fontSize: 6, color: "#666" }}>
                    @ Rs. {Number(item.price).toFixed(2)} each
                  </Text>
                  {hasDiscount && (
                    <Text style={{ fontSize: 6, color: "#666" }}>
                      Disc: -{Number(item.discount).toFixed(2)} = Rs. {netPrice.toFixed(2)} each
                    </Text>
                  )}
                </View>
                <Text style={styles.right}>
                  {(netPrice * item.quantity).toFixed(2)}
                </Text>
              </View>
            </View>
          );
          })}
          <View style={styles.hr} />
        </View>

        <View style={styles.hr} />

        {/* Totals */}
        <View style={{ textAlign: "right", marginBottom: 4 }}>
          <Text style={{ fontSize: 7 }}>Subtotal: {rawSubtotal.toFixed(2)}</Text>
          {itemDiscountTotal > 0 && (
            <Text style={{ fontSize: 7 }}>
              Discount: -{itemDiscountTotal.toFixed(2)}
            </Text>
          )}
          {/* If fee exists */}
          {(order.fee || 0) > 0 && (
            <Text style={{ fontSize: 7 }}>Fee: {order.fee.toFixed(2)}</Text>
          )}
          <Text style={{ fontSize: 8, fontWeight: "bold" }}>
            Total: {order.total.toFixed(2)}
          </Text>
        </View>

        <View style={styles.hr} />

        {/* Payments - check if 'paymentMethod' matches POS structure */}
        {/* If order has specific POS payment details, render them. Otherwise show generic */}
        <View style={{ marginBottom: 4 }}>
          <Text style={{ fontSize: 5 }}>
            Payment Method: {order.paymentMethod}
          </Text>
        </View>

        <View style={styles.hr} />
        {/* Footer */}
        <View style={styles.textCenter}>
          <Text style={{ fontSize: 7 }}>Thank You for Shopping!</Text>
          <Text style={{ fontSize: 6 }}>
            No further service without receipt!
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default POSInvoicePDF;
