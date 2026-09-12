// KisanJod - Admin Stats API
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];

    const totalBookings = await db.booking.count();
    const todayBookings = await db.booking.count({ where: { bookedDate: today } });
    const completedBookings = await db.booking.count({ where: { status: "COMPLETED" } });
    const waitingBookings = await db.booking.count({ where: { status: "WAITING" } });

    const bills = await db.procurementBill.aggregate({
      _sum: { netWeightQtl: true, netAmountPayable: true },
      _count: true,
    });

    const payments = await db.dbtPayment.groupBy({
      by: ["status"],
      _count: true,
      _sum: { amountInr: true },
    });

    const centres = await db.procurementCenter.findMany({
      include: {
        _count: { select: { bookings: true } },
        bookings: {
          where: { bookedDate: today },
          select: { status: true },
        },
      },
    });

    const centreStats = centres.map((c) => ({
      name: c.name,
      district: c.district,
      totalBookings: c._count.bookings,
      todayWaiting: c.bookings.filter((b) => b.status === "WAITING").length,
      todayCompleted: c.bookings.filter((b) => b.status === "COMPLETED").length,
      todayTotal: c.bookings.length,
      maxDailySlots: c.maxDailySlots,
      utilization: c.bookings.length > 0 ? Math.round((c.bookings.length / c.maxDailySlots) * 100) : 0,
    }));

    return NextResponse.json({
      overview: {
        totalBookings,
        todayBookings,
        completedBookings,
        waitingBookings,
        totalProcuredQtl: bills._sum.netWeightQtl || 0,
        totalAmountInr: bills._sum.netAmountPayable || 0,
        billsGenerated: bills._count,
      },
      payments: payments.map((p) => ({
        status: p.status,
        count: p._count,
        totalAmount: p._sum.amountInr || 0,
      })),
      centreStats,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
