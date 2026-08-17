import {
  AC_TYPE_OPTIONS,
  FUEL_TYPE_OPTIONS,
  GPS_OPTIONS,
  OWNERSHIP_OPTIONS,
  SEATING_OPTIONS,
} from "../constants/vehicleFields";

const inputCls = "w-full border rounded-lg px-3 py-2 bg-white";
const labelCls = "block text-xs font-semibold text-slate-600 mb-1";

function Labeled({ label, children }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

/**
 * Fleetbook-style vehicle information fields (ownership, chassis, GPS, expiries…).
 * `value` / `onChange` work like a controlled form slice.
 */
export default function VehicleInfoFields({
  value,
  onChange,
  vehicleTypes = [],
  showVehicleType = true,
  showStatus = true,
  showExpirySection = true,
  dense = false,
}) {
  const set = (patch) => onChange({ ...value, ...patch });
  const grid = dense ? "grid sm:grid-cols-2 gap-3" : "grid md:grid-cols-3 gap-3";

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-bold text-btt-navy mb-2">Vehicle information</div>
        <div className={grid}>
          <Labeled label="Ownership">
            <select
              className={inputCls}
              value={value.ownership || ""}
              onChange={(e) => set({ ownership: e.target.value })}
            >
              <option value="">Select</option>
              {OWNERSHIP_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Labeled>
          {showVehicleType ? (
            <Labeled label="Model / type">
              <select
                className={inputCls}
                value={value.vehicle_type_id || ""}
                onChange={(e) => set({ vehicle_type_id: e.target.value })}
              >
                <option value="">Select type</option>
                {vehicleTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Labeled>
          ) : null}
          <Labeled label="Manufacture year">
            <input
              className={inputCls}
              type="number"
              min={1980}
              max={2100}
              placeholder="e.g. 2025"
              value={value.manufacture_year || ""}
              onChange={(e) => set({ manufacture_year: e.target.value.replace(/\D/g, "").slice(0, 4) })}
            />
          </Labeled>
          <Labeled label="Fuel type">
            <select
              className={inputCls}
              value={value.fuel_type || ""}
              onChange={(e) => set({ fuel_type: e.target.value })}
            >
              <option value="">Select</option>
              {FUEL_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Labeled>
          <Labeled label="Seating capacity">
            <select
              className={inputCls}
              value={value.seating_capacity || ""}
              onChange={(e) => set({ seating_capacity: e.target.value })}
            >
              <option value="">Select</option>
              {SEATING_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} seater{n === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </Labeled>
          <Labeled label="Date of registration">
            <input
              className={inputCls}
              type="date"
              value={value.registration_date || ""}
              onChange={(e) => set({ registration_date: e.target.value })}
            />
          </Labeled>
          <Labeled label="AC / Non-AC">
            <select
              className={inputCls}
              value={value.ac_type || ""}
              onChange={(e) => set({ ac_type: e.target.value })}
            >
              <option value="">Select</option>
              {AC_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Labeled>
          {showStatus ? (
            <Labeled label="Status (active)">
              <select
                className={inputCls}
                value={value.is_active === false || value.is_active === 0 || value.is_active === "0" ? "0" : "1"}
                onChange={(e) => set({ is_active: e.target.value === "1" })}
              >
                <option value="1">Active (A)</option>
                <option value="0">Inactive</option>
              </select>
            </Labeled>
          ) : null}
        </div>
      </div>

      <div>
        <div className="text-sm font-bold text-btt-navy mb-2">Owner & attachment</div>
        <div className={grid}>
          <Labeled label="Owner name">
            <input
              className={inputCls}
              value={value.owner_name || ""}
              onChange={(e) => set({ owner_name: e.target.value })}
              placeholder="Owner name"
            />
          </Labeled>
          <Labeled label="Owner mobile">
            <input
              className={inputCls}
              value={value.owner_phone || ""}
              onChange={(e) => set({ owner_phone: e.target.value })}
              placeholder="Mobile"
              inputMode="numeric"
            />
          </Labeled>
          <Labeled label="Attach date">
            <input
              className={inputCls}
              type="date"
              value={value.attach_date || ""}
              onChange={(e) => set({ attach_date: e.target.value })}
            />
          </Labeled>
          <Labeled label="Sub vendor">
            <input
              className={inputCls}
              value={value.sub_vendor || ""}
              onChange={(e) => set({ sub_vendor: e.target.value })}
              placeholder="NA / vendor name"
            />
          </Labeled>
        </div>
      </div>

      <div>
        <div className="text-sm font-bold text-btt-navy mb-2">Technical & GPS</div>
        <div className={grid}>
          <Labeled label="Engine number">
            <input
              className={`${inputCls} font-mono uppercase`}
              value={value.engine_number || ""}
              onChange={(e) => set({ engine_number: e.target.value.toUpperCase() })}
            />
          </Labeled>
          <Labeled label="Chassis number">
            <input
              className={`${inputCls} font-mono uppercase`}
              value={value.chassis_number || ""}
              onChange={(e) => set({ chassis_number: e.target.value.toUpperCase() })}
            />
          </Labeled>
          <Labeled label="GPS">
            <select
              className={inputCls}
              value={value.gps_installed === true || value.gps_installed === 1 || value.gps_installed === "1" ? "1" : "0"}
              onChange={(e) => set({ gps_installed: e.target.value })}
            >
              {GPS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Labeled>
          <Labeled label="GPS IMEI no">
            <input
              className={`${inputCls} font-mono`}
              value={value.gps_imei || ""}
              onChange={(e) => set({ gps_imei: e.target.value })}
              disabled={!(value.gps_installed === true || value.gps_installed === 1 || value.gps_installed === "1")}
            />
          </Labeled>
          <Labeled label="GPS vendor">
            <input
              className={inputCls}
              value={value.gps_vendor || ""}
              onChange={(e) => set({ gps_vendor: e.target.value })}
              disabled={!(value.gps_installed === true || value.gps_installed === 1 || value.gps_installed === "1")}
            />
          </Labeled>
        </div>
      </div>

      {showExpirySection ? (
        <div>
          <div className="text-sm font-bold text-btt-navy mb-2">Certificate & permit expiry</div>
          <div className={grid}>
            <Labeled label="Insurance expiry">
              <input
                className={inputCls}
                type="date"
                value={value.insurance_expiry || ""}
                onChange={(e) => set({ insurance_expiry: e.target.value })}
              />
            </Labeled>
            <Labeled label="Fitness certificate expiry">
              <input
                className={inputCls}
                type="date"
                value={value.fitness_expiry || ""}
                onChange={(e) => set({ fitness_expiry: e.target.value })}
              />
            </Labeled>
            <Labeled label="Pollution certificate expiry">
              <input
                className={inputCls}
                type="date"
                value={value.puc_expiry || ""}
                onChange={(e) => set({ puc_expiry: e.target.value })}
              />
            </Labeled>
            <Labeled label="42 / 47 expiry">
              <input
                className={inputCls}
                type="date"
                value={value.form_42_47_expiry || ""}
                onChange={(e) => set({ form_42_47_expiry: e.target.value })}
              />
            </Labeled>
            <Labeled label="49 expiry">
              <input
                className={inputCls}
                type="date"
                value={value.form_49_expiry || ""}
                onChange={(e) => set({ form_49_expiry: e.target.value })}
              />
            </Labeled>
            <Labeled label="Tax expiry">
              <input
                className={inputCls}
                type="date"
                value={value.tax_expiry || ""}
                onChange={(e) => set({ tax_expiry: e.target.value })}
              />
            </Labeled>
            <Labeled label="Permit expiry">
              <input
                className={inputCls}
                type="date"
                value={value.permit_expiry || ""}
                onChange={(e) => set({ permit_expiry: e.target.value })}
              />
            </Labeled>
          </div>
        </div>
      ) : null}

      <Labeled label="Notes (optional)">
        <input
          className={inputCls}
          value={value.notes || ""}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder="Notes"
        />
      </Labeled>
    </div>
  );
}
