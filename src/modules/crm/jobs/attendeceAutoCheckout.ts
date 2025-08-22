import cron from "node-cron";
import { AttendanceModel } from "../models/attendence.model";

export function startAttendanceAutoCheckoutJob() {
  cron.schedule("59 23 * * *", async () => {
    console.log("⏰ Running auto-checkout job...");

    const now = new Date();

    try {
      // Find all open sessions
      const openAttendances = await AttendanceModel.find({
        "sessions.check_out_time": null,
      });

      for (const attendance of openAttendances) {
        let updated = false;

        attendance.sessions.forEach((session) => {
          if (!session.check_out_time) {
            session.check_out_time = now;
            session.is_auto_checkout = true;

            const duration =
              (session.check_out_time.getTime() -
                session.check_in_time.getTime()) /
              (1000 * 60 * 60); // in hours
            session.work_hours = parseFloat(duration.toFixed(2));

            updated = true;
          }
        });

        if (updated) {
          // recalc total work hours
          attendance.total_work_hours = attendance.sessions.reduce(
            (acc, s) => acc + (s.work_hours || 0),
            0
          );

          await attendance.save();
          console.log(`✅ Auto-checked out: ${attendance.employee_id}`);
        }
      }
    } catch (err) {
      console.error("❌ Auto-checkout job failed:", err);
    }
  });
}
// Run daily at 23:59
