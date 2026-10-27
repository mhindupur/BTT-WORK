import {
  AC_TYPE_OPTIONS,
  FUEL_TYPE_OPTIONS,
  GPS_OPTIONS,
  OWNERSHIP_OPTIONS,
  SEATING_OPTIONS,
  accountSectionTitle,
} from "../constants/vehicleFields";

const inputCls = "w-full border rounded-lg px-3 py-2 bg-white";
const labelCls = "block text-xs font-semibold text-slate-600 mb-1";

function Labeled({ label, children, hint }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-slate-500">{hint}</span> : null}
    </label>
  );
}

function typeLabel(t) {
  const pax = t.passenger_count != null && t.passenger_count !== "" ? Number(t.passenger_count) : null;
  if (pax != null && Number.isFinite(pax)) return `${t.name} (${pax} pax)`;
  return t.name;
}

function AccountFields({ value, set, title }) {
  return (
    <div>
      <div className="text-sm font-bold text-btt-navy mb-2">{title}</div>
      <div className="grid md:grid-cols-2 gap-3">
        <Labeled label="Account holder name">
          <input
            className={inputCls}
            value={value.account_holder_name || ""}
            onChange={(e) => set({ account_holder_name: e.target.value })}
            placeholder="Name as in bank account"
          />
        </Labeled>
        <Labeled label="Account number">
          <input
            className={`${inputCls} font-mono`}
            value={value.account_number || ""}
            onChange={(e) => set({ account_number: e.target.value.replace(/\s/g, "") })}
            placeholder="Account number"
            inputMode="numeric"
          />
        </Labeled>
        <Labeled label="IFSC">
          <input
            className={`${inputCls} font-mono uppercase`}
            value={value.account_ifsc || ""}
            onChange={(e) => set({ account_ifsc: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11) })}
            placeholder="e.g. HDFC0001234"
          />
        </Labeled>
        <Labeled label="Bank name">
          <input
            className={inputCls}
            value={value.account_bank_name || ""}
            onChange={(e) => set({ account_bank_name: e.target.value })}
            placeholder="Bank name"
          />
        </Labeled>
      </div>
    </div>
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
  gpsVendors = [],
  showVehicleType = true,
  showStatus = true,
  showExpirySection = true,
  dense = false,
}) {
  const set = (patch) => onChange({ ...value, ...patch });
  const grid = dense ? "grid sm:grid-cols-2 gap-3" : "grid md:grid-cols-3 gap-3";
  const gpsOn = value.gps_installed === true || value.gps_installed === 1 || value.gps_installed === "1";
  const ownership = value.ownership || "";
  const ownershipMeta = OWNERSHIP_OPTIONS.find((o) => o.value === ownership);
  const isDriverOwner = ownership === "DRIVER_OWNER";
  const showSeparateDriver = ownership === "OWNER" || ownership === "SUB_VENDOR" || ownership === "CONTRACTUAL";
  const showOwner = Boolean(ownership);
  const showSubVendor = ownership === "SUB_VENDOR";
  const showContractual = ownership === "CONTRACTUAL";
  const showAccount = Boolean(ownership);

  function onVehicleTypeChange(rawId) {
    const patch = { vehicle_type_id: rawId };
    if (rawId) {
      const t = vehicleTypes.find((x) => String(x.id) === String(rawId));
      const pax = t?.passenger_count != null ? Number(t.passenger_count) : null;
      if (pax != null && Number.isFinite(pax) && pax >= 1) {
        patch.seating_capacity = String(pax);
      }
    }
    set(patch);
  }

  function onOwnershipChange(next) {
    const patch = { ownership: next };
    if (next === "DRIVER_OWNER") {
      patch.driver_name = value.owner_name || "";
      patch.driver_phone = value.owner_phone || "";
    }
    if (next !== "SUB_VENDOR") {
      // keep existing values but UI hides them
    }
    set(patch);
  }

  function onOwnerNameChange(name) {
    const patch = { owner_name: name };
    if (isDriverOwner) patch.driver_name = name;
    set(patch);
  }

  function onOwnerPhoneChange(phone) {
    const patch = { owner_phone: phone };
    if (isDriverOwner) patch.driver_phone = phone;
    set(patch);
  }

  function onGpsChange(raw) {
    const patch = { gps_installed: raw };
    if (raw !== "1") {
      patch.gps_imei = "";
      patch.gps_vendor = "";
      patch.gps_vendor_id = "";
    }
    set(patch);
  }

  function onGpsVendorChange(rawId) {
    if (!rawId) {
      set({ gps_vendor_id: "", gps_vendor: "" });
      return;
    }
    const v = gpsVendors.find((x) => String(x.id) === String(rawId));
    set({
      gps_vendor_id: rawId,
      gps_vendor: v?.name || "",
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-bold text-btt-navy mb-2">Vehicle information</div>
        <div className={grid}>
          <Labeled label="Ownership type *" hint={ownershipMeta?.help}>
            <select
              className={inputCls}
              value={ownership}
              onChange={(e) => onOwnershipChange(e.target.value)}
              required
            >
              <option value="">Select ownership</option>
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
                onChange={(e) => onVehicleTypeChange(e.target.value)}
              >
                <option value="">Select type</option>
                {vehicleTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {typeLabel(t)}
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
          <Labeled label="No. of passengers">
            <select
              className={inputCls}
              value={value.seating_capacity || ""}
              onChange={(e) => set({ seating_capacity: e.target.value })}
            >
              <option value="">Select</option>
              {SEATING_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Labeled>
          <Labeled label="Induction date">
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
          <Labeled label="Attach date">
            <input
              className={inputCls}
              type="date"
              value={value.attach_date || ""}
              onChange={(e) => set({ attach_date: e.target.value })}
            />
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

      {showSeparateDriver ? (
        <div>
          <div className="text-sm font-bold text-btt-navy mb-2">Driver details</div>
          <div className={grid}>
            <Labeled label="Driver full name *">
              <input
                className={inputCls}
                value={value.driver_name || ""}
                onChange={(e) => set({ driver_name: e.target.value })}
                placeholder="Driver full name"
              />
            </Labeled>
            <Labeled label="Driver mobile *">
              <input
                className={inputCls}
                value={value.driver_phone || ""}
                onChange={(e) => set({ driver_phone: e.target.value })}
                placeholder="Mobile"
                inputMode="numeric"
              />
            </Labeled>
          </div>
        </div>
      ) : null}

      {showOwner ? (
        <div>
          <div className="text-sm font-bold text-btt-navy mb-2">
            {isDriverOwner ? "Driver / Owner details" : "Owner details"}
          </div>
          <div className={grid}>
            <Labeled label={isDriverOwner ? "Full name *" : "Owner full name *"}>
              <input
                className={inputCls}
                value={value.owner_name || ""}
                onChange={(e) => onOwnerNameChange(e.target.value)}
                placeholder="Full name"
              />
            </Labeled>
            <Labeled label={isDriverOwner ? "Mobile number *" : "Owner mobile *"}>
              <input
                className={inputCls}
                value={value.owner_phone || ""}
                onChange={(e) => onOwnerPhoneChange(e.target.value)}
                placeholder="Mobile"
                inputMode="numeric"
              />
            </Labeled>
            {isDriverOwner ? (
              <p className="text-xs text-slate-500 md:col-span-1 self-end pb-2">
                Owner and driver are the same person for this ownership type.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {showSubVendor ? (
        <div>
          <div className="text-sm font-bold text-btt-navy mb-2">Sub-vendor details</div>
          <div className={grid}>
            <Labeled label="Sub-vendor full name *">
              <input
                className={inputCls}
                value={value.sub_vendor || ""}
                onChange={(e) => set({ sub_vendor: e.target.value })}
                placeholder="Sub-vendor name"
              />
            </Labeled>
            <Labeled label="Sub-vendor mobile *">
              <input
                className={inputCls}
                value={value.sub_vendor_phone || ""}
                onChange={(e) => set({ sub_vendor_phone: e.target.value })}
                placeholder="Mobile"
                inputMode="numeric"
              />
            </Labeled>
          </div>
        </div>
      ) : null}

      {showContractual ? (
        <div>
          <div className="text-sm font-bold text-btt-navy mb-2">Contractual details</div>
          <div className={grid}>
            <Labeled label="Contractual full name *">
              <input
                className={inputCls}
                value={value.contractual_name || ""}
                onChange={(e) => set({ contractual_name: e.target.value })}
                placeholder="Contractual party name"
              />
            </Labeled>
            <Labeled label="Contractual mobile *">
              <input
                className={inputCls}
                value={value.contractual_phone || ""}
                onChange={(e) => set({ contractual_phone: e.target.value })}
                placeholder="Mobile"
                inputMode="numeric"
              />
            </Labeled>
          </div>
        </div>
      ) : null}

      {showAccount ? <AccountFields value={value} set={set} title={accountSectionTitle(ownership)} /> : null}

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
            <select className={inputCls} value={gpsOn ? "1" : "0"} onChange={(e) => onGpsChange(e.target.value)}>
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
              disabled={!gpsOn}
            />
          </Labeled>
          <Labeled label="GPS type / vendor">
            <select
              className={inputCls}
              value={value.gps_vendor_id || ""}
              onChange={(e) => onGpsVendorChange(e.target.value)}
              disabled={!gpsOn}
            >
              <option value="">Select GPS type</option>
              {gpsVendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
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
