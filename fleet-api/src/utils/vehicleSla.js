export function vehicleAgeYears(registrationDate, manufactureYear, asOf = new Date()) {
  let start = null;
  if (registrationDate) {
    const s = String(registrationDate).slice(0, 10);
    start = new Date(`${s}T00:00:00`);
  } else if (manufactureYear) {
    start = new Date(Number(manufactureYear), 0, 1);
  }
  if (!start || Number.isNaN(start.getTime())) return null;
  let years = asOf.getFullYear() - start.getFullYear();
  const m = asOf.getMonth() - start.getMonth();
  if (m < 0 || (m === 0 && asOf.getDate() < start.getDate())) years -= 1;
  return years;
}

/** Site SLA: vehicles must be younger than slaMaxAgeYears (e.g. 3 = under 3 years). */
export function assertVehicleSla(client, fields) {
  const sla = client?.sla_max_age_years != null ? Number(client.sla_max_age_years) : null;
  if (!sla || sla <= 0) return null;
  const regDate = fields.registration_date || null;
  if (!regDate) {
    return {
      error: `This site requires vehicles younger than ${sla} year(s). Date of registration is required.`,
      status: 400,
    };
  }
  const age = vehicleAgeYears(regDate, fields.manufacture_year);
  if (age != null && age >= sla) {
    return {
      error: `Vehicle is ${age} year(s) old. Site SLA allows vehicles younger than ${sla} year(s) (from date of registration).`,
      status: 400,
    };
  }
  return null;
}

export const SLA_SELECT = `c.site_code, c.sla_max_age_years,
  TIMESTAMPDIFF(YEAR,
    COALESCE(v.registration_date, IF(v.manufacture_year IS NULL, NULL, STR_TO_DATE(CONCAT(v.manufacture_year,'-01-01'), '%Y-%m-%d'))),
    CURDATE()) AS vehicle_age_years,
  CASE
    WHEN c.sla_max_age_years IS NULL OR c.sla_max_age_years <= 0 THEN 0
    WHEN COALESCE(v.registration_date, IF(v.manufacture_year IS NULL, NULL, STR_TO_DATE(CONCAT(v.manufacture_year,'-01-01'), '%Y-%m-%d'))) IS NULL THEN 0
    WHEN TIMESTAMPDIFF(YEAR,
      COALESCE(v.registration_date, STR_TO_DATE(CONCAT(v.manufacture_year,'-01-01'), '%Y-%m-%d')),
      CURDATE()) >= c.sla_max_age_years THEN 1
    ELSE 0
  END AS sla_exceeded`;
