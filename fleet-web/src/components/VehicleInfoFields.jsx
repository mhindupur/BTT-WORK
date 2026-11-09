import { useEffect, useState } from "react";
import api from "../api";
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

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

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
  const [ifscMsg, setIfscMsg] = useState("");
  const [ifscBusy, setIfscBusy] = useState(false);

  async function verifyIfsc() {
    const code = String(value.account_ifsc || "")
      .trim()
      .toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(code)) {
      setIfscMsg("Enter a valid 11-character IFSC first");
      return;
    }
    setIfscBusy(true);
    setIfscMsg("");
    try {
      const { data } = await api.get(`/ifsc/${code}`);
      set({
        account_ifsc: code,
        account_bank_name: data.BANK || data.bank || data.bank_name || value.account_bank_name || "",
        account_holder_name: value.account_holder_name || "",
        // branch/city available in response for display; bank name is primary fill
      });
      const branch = data.BRANCH || data.branch || "";
      const city = data.CITY || data.city || "";
      setIfscMsg(
        [data.BANK || data.bank, branch, city].filter(Boolean).join(" · ") || "IFSC verified"
      );
    } catch (e) {
      setIfscMsg(e?.response?.data?.error || e.message || "IFSC verification failed");
    } finally {
      setIfscBusy(false);
    }
  }

  return (
    <div>
      <div className="text-sm font-bold text-btt-navy mb-2">{title}</div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <Labeled label="IFSC code *">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                className={`${inputCls} font-mono uppercase flex-1`}
                value={value.account_ifsc || ""}
                onChange={(e) => {
                  setIfscMsg("");
                  set({
                    account_ifsc: e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "")
                      .slice(0, 11),
                  });
                }}
                placeholder="e.g. HDFC0001234"
                maxLength={11}
              />
              <button
                type="button"
                onClick={verifyIfsc}
                disabled={ifscBusy}
                className="px-4 py-2 rounded-lg bg-btt-navy text-white text-sm font-semibold whitespace-nowrap disabled:opacity-60"
              >
                {ifscBusy ? "Verifying…" : "Verify IFSC"}
              </button>
            </div>
          </Labeled>
          {ifscMsg ? <p className="mt-1 text-xs text-slate-600">{ifscMsg}</p> : null}
        </div>
        <Labeled label="Bank name">
          <input
            className={inputCls}
            value={value.account_bank_name || ""}
            onChange={(e) => set({ account_bank_name: e.target.value })}
            placeholder="Filled after IFSC verify"
          />
        </Labeled>
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
      </div>
    </div>
  );
}

/**
 * Fleet vehicle information fields.
 * Order: Vehicle → Driver/ownership → Banking → Technical
 */
export default function VehicleInfoFields({
  value,
  onChange,
  vehicleTypes = [],
  gpsVendors = [],
  showVehicleType = true,
  showStatus = true,
  showExpirySection = true,
  showRcUpload = true,
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

  // Induction date always today (non-editable)
  useEffect(() => {
    const today = todayISO();
    if (value.registration_date !== today) {
      set({ registration_date: today });
    }
    if (!value.ac_type) {
      set({ ac_type: "AC" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function onRcFile(file) {
    if (!file) {
      set({ rc_preview_url: "", rc_file: null });
      return;
    }
    const url = URL.createObjectURL(file);
    set({ rc_preview_url: url, rc_file: file });
  }

  const partySectionTitle =
    !ownership || isDriverOwner
      ? "Driver / Owner details"
      : ownership === "SUB_VENDOR"
        ? "Sub-vendor details"
        : ownership === "CONTRACTUAL"
          ? "Contractual details"
          : "Ownership";

  const vehicleBlock = (
    <div>
      <div className="text-sm font-bold text-btt-navy mb-2">Vehicle information</div>
      <div className={grid}>
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
        <Labeled label="Registered date">
          <input
            className={inputCls}
            type="date"
            value={value.registered_date || ""}
            onChange={(e) => {
              const d = e.target.value;
              const y = d ? Number(d.slice(0, 4)) : "";
              set({ registered_date: d, manufacture_year: y ? String(y) : "" });
            }}
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
        <Labeled label="Induction date" hint="Set to today and locked">
          <input
            className={`${inputCls} bg-slate-100 text-slate-600`}
            type="date"
            value={value.registration_date || todayISO()}
            readOnly
            disabled
          />
        </Labeled>
        <Labeled label="AC / Non-AC">
          <select
            className={inputCls}
            value={value.ac_type || "AC"}
            onChange={(e) => set({ ac_type: e.target.value })}
          >
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

      {showRcUpload ? (
        <div className="mt-4">
          <Labeled label="Upload RC Book" hint="Preview opens on the right — use it to copy engine / chassis details">
            <input
              type="file"
              accept="image/*,application/pdf"
              className="block w-full text-sm"
              onChange={(e) => onRcFile(e.target.files?.[0] || null)}
            />
          </Labeled>
        </div>
      ) : null}
    </div>
  );

  const driverBlock = (
    <>
      <div>
        <div className="text-sm font-bold text-btt-navy mb-2">{partySectionTitle}</div>
        <div className="mb-3">
          <div className={labelCls}>Ownership type *</div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2" role="radiogroup" aria-label="Ownership type">
            {OWNERSHIP_OPTIONS.map((o) => {
              const selected = ownership === o.value;
              return (
                <label
                  key={o.value}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition select-none ${
                    selected
                      ? "border-btt-green bg-btt-green/10 ring-1 ring-btt-green text-btt-navy"
                      : "border-slate-200 bg-white hover:border-btt-accent/50 text-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="vehicle-ownership"
                    className="h-4 w-4 accent-btt-green shrink-0"
                    value={o.value}
                    checked={selected}
                    onChange={() => onOwnershipChange(o.value)}
                    required
                  />
                  <span className="text-sm font-semibold leading-tight">{o.label}</span>
                </label>
              );
            })}
          </div>
          {ownershipMeta?.help ? (
            <p className="mt-2 text-[11px] text-slate-500">{ownershipMeta.help}</p>
          ) : (
            <p className="mt-2 text-[11px] text-slate-500">
              Select one ownership type. Matching name, mobile, and account fields appear below.
            </p>
          )}
        </div>

        {isDriverOwner ? (
          <div className={grid}>
            <Labeled label="Full name *">
              <input
                className={inputCls}
                value={value.owner_name || ""}
                onChange={(e) => onOwnerNameChange(e.target.value)}
                placeholder="Full name"
              />
            </Labeled>
            <Labeled label="Mobile number *">
              <input
                className={inputCls}
                value={value.owner_phone || ""}
                onChange={(e) => onOwnerPhoneChange(e.target.value)}
                placeholder="Mobile"
                inputMode="numeric"
              />
            </Labeled>
          </div>
        ) : null}
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

      {showOwner && !isDriverOwner ? (
        <div>
          <div className="text-sm font-bold text-btt-navy mb-2">Owner details</div>
          <div className={grid}>
            <Labeled label="Owner full name *">
              <input
                className={inputCls}
                value={value.owner_name || ""}
                onChange={(e) => onOwnerNameChange(e.target.value)}
                placeholder="Full name"
              />
            </Labeled>
            <Labeled label="Owner mobile *">
              <input
                className={inputCls}
                value={value.owner_phone || ""}
                onChange={(e) => onOwnerPhoneChange(e.target.value)}
                placeholder="Mobile"
                inputMode="numeric"
              />
            </Labeled>
          </div>
        </div>
      ) : null}

      {showSubVendor ? (
        <div>
          <div className="text-sm font-bold text-btt-navy mb-2">Sub-vendor contact</div>
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
          <div className="text-sm font-bold text-btt-navy mb-2">Contractual contact</div>
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
    </>
  );

  const bankingBlock = showAccount ? (
    <AccountFields value={value} set={set} title={accountSectionTitle(ownership)} />
  ) : null;

  const technicalBlock = (
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
  );

  const expiryBlock = showExpirySection ? (
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
  ) : null;

  const formColumn = (
    <div className="space-y-4 min-w-0">
      {vehicleBlock}
      {driverBlock}
      {bankingBlock}
      {technicalBlock}
      {expiryBlock}
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

  if (!showRcUpload) return formColumn;

  return (
    <div className="grid lg:grid-cols-2 gap-4 items-start">
      {formColumn}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 min-h-[280px] lg:sticky lg:top-4">
        <div className="text-sm font-bold text-btt-navy mb-2">RC Book preview</div>
        <p className="text-xs text-slate-500 mb-3">
          Upload RC on the left. Preview here to copy engine number, chassis number, and other details into the form.
        </p>
        {value.rc_preview_url ? (
          String(value.rc_file?.type || "").includes("pdf") ? (
            <iframe title="RC preview" src={value.rc_preview_url} className="w-full h-[70vh] rounded-lg bg-white border" />
          ) : (
            <img
              src={value.rc_preview_url}
              alt="RC Book preview"
              className="w-full max-h-[70vh] object-contain rounded-lg bg-white border"
            />
          )
        ) : (
          <div className="h-48 flex items-center justify-center text-sm text-slate-400 border border-dashed rounded-lg">
            No RC uploaded yet
          </div>
        )}
      </div>
    </div>
  );
}
