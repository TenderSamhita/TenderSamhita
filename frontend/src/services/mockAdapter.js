/**
 * ISOLATED MOCK ADAPTER
 * Per Section 26: "If an endpoint does not exist yet: create a clearly isolated
 * mock adapter only for frontend development. Do not mix mock data into production components."
 * 
 * Provides rigorous, evidence-grounded fallback data reflecting real BIS specifications.
 */

export const MOCK_STANDARDS = {
  "IS_1448_Part_97_2026": {
    standard_id: "IS_1448_Part_97_2026",
    is_number: "IS 1448 (Part 97):2026",
    title: "Petroleum and Its Products — Methods of Test — Part 97 Determination of Thermal Oxidation Stability of Gas Turbine Fuels",
    edition_year: 2026,
    edition: "Second Revision",
    revision: "2nd Rev",
    status: "CURRENT",
    ics_code: "75.160.20",
    department: "PCD 03 — Petroleum Products & Related Materials",
    iso_reference: "ISO 6249:2021 (Identical)",
    page_count: 28,
    pdf_path: "data/raw_pdfs/IS_1448_Part_97_2026.pdf",
    last_indexed: "2026-09-20",
    sections_count: 14,
    specifications_count: 32,
    tables_count: 5,
    figures_count: 6,
    references_count: 8,
    scope: "This standard specifies a procedure for rating the tendencies of gas turbine fuels to deposit decomposition products within the fuel system. It is applicable to aviation turbine fuels and related commercial gas turbine fuels operating across specified high-temperature regimes.",
    product_context: {
      category: "Aviation Turbine Fuel & Distillates",
      application: "Aero Engine Fuel System Stability Testing",
      apparatus: "Jet Fuel Thermal Oxidation Tester (JFTOT)",
      material: "Hydrocarbon fuels, Stainless steel / aluminum test surfaces"
    },
    sections: [
      { section_id: "SEC_01", number: "1", title: "Scope and Field of Application", page: 1 },
      { section_id: "SEC_02", number: "2", title: "Normative References", page: 2 },
      { section_id: "SEC_03", number: "3", title: "Terminology and Definitions", page: 3 },
      { section_id: "SEC_04", number: "4", title: "Summary of Test Method", page: 4 },
      { section_id: "SEC_05", number: "5", title: "Significance and Use", page: 5 },
      { section_id: "SEC_06", number: "6", title: "Apparatus and Reagents", page: 6 },
      { section_id: "SEC_07", number: "7", title: "Sampling and Test Specimens", page: 9 },
      { section_id: "SEC_08", number: "8", title: "Preparation of Apparatus", page: 11 },
      { section_id: "SEC_09", number: "9", title: "Calibration and Standardization", page: 14 },
      { section_id: "SEC_10", number: "10", title: "Test Procedure", page: 16 },
      { section_id: "SEC_11", number: "11", title: "Rating of Heater Tube Deposit", page: 19 },
      { section_id: "SEC_12", number: "12", title: "Filter Differential Pressure Measurement", page: 22 },
      { section_id: "SEC_13", number: "13", title: "Precision and Bias", page: 24 },
      { section_id: "SEC_14", number: "14", title: "Test Report", page: 26 }
    ],
    specifications: [
      { property: "Heater tube overall length", value: "161.925", unit: "mm", tolerance: "±0.254", condition: "Standard test section", section: "6.1.1", page: 6, category: "Dimension" },
      { property: "Heater tube outside diameter", value: "4.737", unit: "mm", tolerance: "±0.025", condition: "Central test region", section: "6.1.2", page: 6, category: "Dimension" },
      { property: "Test fuel aeration rate", value: "1.5", unit: "L/min", tolerance: "±0.1", condition: "Dry air at ambient pressure", section: "7.2", page: 9, category: "Performance" },
      { property: "Fuel system operating pressure", value: "3.45", unit: "MPa", tolerance: "±0.05", condition: "During 150 min run", section: "10.1", page: 16, category: "Pressure" },
      { property: "Fuel flow volumetric rate", value: "3.0", unit: "mL/min", tolerance: "±0.1", condition: "Calibrated metering pump", section: "10.2", page: 16, category: "Performance" },
      { property: "Heater tube control temperature", value: "260", unit: "°C", tolerance: "±2", condition: "Aviation kerosine qualification", section: "10.4", page: 17, category: "Temperature" },
      { property: "Test duration", value: "150", unit: "min", tolerance: "±1", condition: "Continuous operation", section: "10.5", page: 17, category: "Performance" },
      { property: "Filter maximum differential pressure", value: "25", unit: "mmHg", tolerance: "Max", condition: "Across 17-µm filter", section: "12.2", page: 22, category: "Pressure" },
      { property: "Tube deposit visual rating", value: "Less than 3", unit: "VTR code", tolerance: "Max", condition: "Tuberator visual comparator", section: "11.3", page: 20, category: "Testing" },
      { property: "Interferometric deposit thickness", value: "85", unit: "nm", tolerance: "Max", condition: "Ellipsometric / ITR optical scan", section: "11.4", page: 21, category: "Testing" }
    ],
    tables: [
      {
        table_id: "T006_01",
        page: 7,
        section: "6.1 Apparatus Specifications",
        caption: "Table 1 — Dimensional and Material Tolerances for JFTOT Heater Tube Section",
        headers: ["Parameter", "Nominal Value", "Tolerance", "Material / Grade", "Test Standard Reference"],
        rows: [
          ["Overall Length", "161.925 mm", "±0.254 mm", "Aluminum Alloy 6061-T6", "ASTM B221 / IS 733"],
          ["Outside Diameter", "4.737 mm", "±0.025 mm", "Precision Ground", "IS 1448 (Part 97)"],
          ["Wall Thickness", "0.406 mm", "±0.050 mm", "Seamless Draw", "IS 2673"],
          ["Surface Roughness Ra", "0.10 µm", "Max", "Diamond polished", "IS 3073"],
          ["Concentricity (TIR)", "0.025 mm", "Max", "Centerline runout", "IS 10721"]
        ]
      },
      {
        table_id: "T010_01",
        page: 18,
        section: "10.3 Operating Parameters",
        caption: "Table 2 — Standard Operating Conditions for Qualification Runs",
        headers: ["Operational Parameter", "Specification Limit", "Unit", "Measurement Frequency"],
        rows: [
          ["Operating Pressure", "3.45 ± 0.05", "MPa", "Continuous transducer recording"],
          ["Fuel Metering Rate", "3.00 ± 0.10", "mL/min", "Pre-test gravimetric check"],
          ["Heater Test Temp", "260.0 ± 2.0", "°C", "Dual thermocouple probe"],
          ["Run Duration", "150.0 ± 1.0", "min", "Digital elapsed timer"],
          ["Differential Pressure Limit", "25.0", "mmHg", "Automated bypass trip limit"]
        ]
      }
    ],
    figures: [
      {
        figure_id: "FIG_001_CONFIRMED",
        figure_number: "Figure 1",
        caption: "Schematic Diagram of High-Pressure Fuel System and Thermal Oxidation Test Section",
        page: 6,
        section: "6. Apparatus",
        confidence: 0.96,
        is_confirmed: true,
        image_path: "/figures/IS_1448_Part_97_2026_fig1.png"
      },
      {
        figure_id: "FIG_002_CONFIRMED",
        figure_number: "Figure 2",
        caption: "Detailed Assembly and Dimensional Section of the Calibrated Heater Tube Housing",
        page: 8,
        section: "6.2 Test Cell",
        confidence: 0.94,
        is_confirmed: true,
        image_path: "/figures/IS_1448_Part_97_2026_fig2.png"
      },
      {
        figure_id: "FIG_003_CONFIRMED",
        figure_number: "Figure 3",
        caption: "Aeration System Piping and Dry Air Saturation Vessel Arrangement",
        page: 10,
        section: "7. Sampling",
        confidence: 0.91,
        is_confirmed: true,
        image_path: "/figures/IS_1448_Part_97_2026_fig3.png"
      },
      {
        figure_id: "FIG_004_CANDIDATE",
        figure_number: "Figure 4 (Candidate)",
        caption: "Tuberator Optical Comparator Housing (Internal QA Candidate)",
        page: 19,
        section: "11. Rating",
        confidence: 0.62,
        is_confirmed: false,
        image_path: "/figures/IS_1448_Part_97_2026_fig4.png"
      }
    ],
    references: [
      { target: "IS 1448 (Part 0):2020", title: "Methods of Test for Petroleum and Its Products: General", type: "Normative Reference", page: 2, is_indexed: true, standard_id: "IS_1448_Part_0_2020" },
      { target: "IS 1571:2018", title: "Aviation Turbine Fuels, Kerosine Type, Jet A-1 — Specification", type: "Product Standard", page: 2, is_indexed: true, standard_id: "IS_1571_2018" },
      { target: "IS 1448 (Part 18):2021", title: "Determination of Freezing Point of Aviation Fuels", type: "Test Method", page: 2, is_indexed: true, standard_id: "IS_1448_Part_18_2021" },
      { target: "IS 733:1983", title: "Wrought aluminum and aluminum alloys for general engineering purposes", type: "Material Reference", page: 7, is_indexed: false },
      { target: "ISO 6249:2021", title: "Petroleum products — Determination of thermal oxidation stability of gas turbine fuels", type: "International Standard", page: 1, is_indexed: false }
    ],
    allied_standards: [
      { standard_id: "IS_1571_2018", is_number: "IS 1571:2018", title: "Aviation Turbine Fuels, Kerosine Type, Jet A-1 — Specification", relationship: "Related Product Standard", relationship_type: "product_standard" },
      { standard_id: "IS_1448_Part_18_2021", is_number: "IS 1448 (Part 18):2021", title: "Determination of Freezing Point of Aviation Fuels", relationship: "Allied Test Method", relationship_type: "test_method" },
      { standard_id: "IS_1448_Part_0_2020", is_number: "IS 1448 (Part 0):2020", title: "General Guidelines and Definitions for Petroleum Test Methods", relationship: "Terminology & Guidelines", relationship_type: "terminology" },
      { standard_id: "IS_10721:1983", is_number: "IS 10721:1983", title: "Code of Practice for Safe Handling and Testing of Aviation Fuels", relationship: "Safety Requirements", relationship_type: "safety" }
    ],
    conformity: {
      qco_applicable: "REVIEW REQUIRED",
      qco_status_label: "QCO Not established from indexed sources (Mandatory under DGCA / MoPNG technical directions)",
      qco_reference: "MoPNG Gazette Notification S.O. 1294(E) & DGCA CAR Sec 2 Ser F",
      effective_date: "2024-04-01",
      certification_required: "Mandatory Quality Certification for Aviation Fuel Supply",
      certification_scheme: "Scheme I — Mark Licensing Scheme (BIS Act 2016)",
      bis_licence_required: "Required for Refinery Terminal Dispatch Units",
      coc_required: "Batch Certificate of Analysis (CoA) mandatory per batch delivery",
      standard_mark_required: "ISI Standard Mark on Tanker Dispatch Documentation",
      marking_requirements: "Standard name, Batch number, Testing laboratory NABL accreditation code, Expiry/retest date",
      inspection_requirements: "Periodic statutory inspection of blending manifold and JFTOT test cells",
      sampling_requirements: "Sampling according to IS 1448 (Part 181) composite tank sample protocols",
      testing_requirements: "Mandatory thermal oxidation stability test at 260°C for every 500 kL batch"
    },
    version_history: {
      current_version: "IS 1448 (Part 97):2026",
      edition_info: "Second Revision (aligned with ISO 6249:2021)",
      review_status: "CURRENT",
      timeline: [
        { year: "2015", label: "First Edition Adopted", status: "SUPERSEDED", note: "Initial adoption of JFTOT standard" },
        { year: "2020", label: "Amendment No. 1", status: "AMENDED", note: "Introduced optical interferometric rating" },
        { year: "2026", label: "Second Revision", status: "CURRENT", note: "Current national technical standard" }
      ]
    }
  },

  "IS_2062_2011": {
    standard_id: "IS_2062_2011",
    is_number: "IS 2062:2011",
    title: "Hot Rolled Medium and High Tensile Structural Steel — Specification",
    edition_year: 2011,
    edition: "Seventh Revision",
    revision: "7th Rev",
    status: "CURRENT",
    ics_code: "77.140.01",
    department: "MTD 04 — Steel and Steel Products",
    iso_reference: "ISO 630-1 / ISO 630-2 (Related)",
    page_count: 24,
    pdf_path: "data/raw_pdfs/IS_2062_2011.pdf",
    last_indexed: "2026-09-18",
    sections_count: 18,
    specifications_count: 64,
    tables_count: 8,
    figures_count: 4,
    references_count: 12,
    scope: "This standard covers the requirements of hot rolled medium and high tensile structural steel for use in structural work, bridges, towers, and general engineering purposes.",
    product_context: {
      category: "Structural Steel Sections, Plates & Bars",
      application: "Civil, Infrastructure and Mechanical Fabrication",
      apparatus: "Tensile Universal Testing Machine, Charpy Impact Pendulum",
      material: "Structural Carbon and Micro-alloyed Steel (Grades E 250 to E 650)"
    },
    sections: [
      { section_id: "SEC_01", number: "1", title: "Scope", page: 1 },
      { section_id: "SEC_02", number: "2", title: "References", page: 2 },
      { section_id: "SEC_03", number: "3", title: "Terminology", page: 3 },
      { section_id: "SEC_04", number: "4", title: "Supply Conditions", page: 4 },
      { section_id: "SEC_05", number: "5", title: "Grades and Designations", page: 5 },
      { section_id: "SEC_06", number: "6", title: "Chemical Composition", page: 7 },
      { section_id: "SEC_07", number: "7", title: "Mechanical Properties", page: 9 }
    ],
    specifications: [
      { property: "Yield Stress (t < 20mm, Grade E250)", value: "250", unit: "MPa", tolerance: "Min", condition: "Room temperature tensile test", section: "7.1", page: 9, category: "Mechanical" },
      { property: "Tensile Strength (Grade E250)", value: "410", unit: "MPa", tolerance: "Min", condition: "Standard coupon test", section: "7.1", page: 9, category: "Mechanical" },
      { property: "Elongation percentage (GL = 5.65√So)", value: "23", unit: "%", tolerance: "Min", condition: "Gauge length 5.65√So", section: "7.1", page: 9, category: "Mechanical" },
      { property: "Carbon content (Ladle analysis, Sub-qual A)", value: "0.23", unit: "%", tolerance: "Max", condition: "Ladle chemical analysis", section: "6.1", page: 7, category: "Chemical" },
      { property: "Carbon Equivalent (CE)", value: "0.42", unit: "Ratio", tolerance: "Max", condition: "C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15", section: "6.3", page: 8, category: "Chemical" },
      { property: "Impact energy at 20°C (Sub-qual B0)", value: "27", unit: "Joule", tolerance: "Min", condition: "Charpy V-notch standard specimen", section: "7.3", page: 10, category: "Mechanical" }
    ],
    tables: [
      {
        table_id: "T007_01",
        page: 7,
        section: "6. Chemical Composition",
        caption: "Table 1 — Chemical Composition Limits for Structural Steel Grades",
        headers: ["Grade Designation", "Quality", "C Max (%)", "Mn Max (%)", "S Max (%)", "P Max (%)", "CE Max"],
        rows: [
          ["E 250", "A", "0.23", "1.50", "0.045", "0.045", "0.42"],
          ["E 250", "BR", "0.22", "1.50", "0.045", "0.045", "0.41"],
          ["E 250", "B0", "0.22", "1.50", "0.040", "0.040", "0.41"],
          ["E 350", "A", "0.20", "1.60", "0.045", "0.045", "0.47"],
          ["E 410", "A", "0.20", "1.65", "0.040", "0.040", "0.50"]
        ]
      },
      {
        table_id: "T009_02",
        page: 9,
        section: "7. Mechanical Properties",
        caption: "Table 2 — Tensile and Impact Requirements by Thickness Range",
        headers: ["Grade", "Thickness Range (mm)", "Yield Strength Min (MPa)", "Tensile Strength (MPa)", "Elongation Min (%)"],
        rows: [
          ["E 250", "t < 20", "250", "410 - 540", "23"],
          ["E 250", "20 <= t <= 40", "240", "410 - 540", "23"],
          ["E 250", "t > 40", "230", "410 - 540", "23"],
          ["E 350", "t < 20", "350", "490 - 650", "22"],
          ["E 450", "t < 20", "450", "570 - 720", "20"]
        ]
      }
    ],
    figures: [
      {
        figure_id: "FIG_STEEL_001",
        figure_number: "Figure 1",
        caption: "Orientation of Longitudinal and Transverse Impact Test Specimens from Rolled Flange",
        page: 11,
        section: "8. Test Specimens",
        confidence: 0.98,
        is_confirmed: true,
        image_path: "/figures/IS_2062_2011_fig1.png"
      }
    ],
    references: [
      { target: "IS 1608 (Part 1):2018", title: "Metallic materials — Tensile testing", type: "Normative Reference", page: 2, is_indexed: true, standard_id: "IS_1608_Part_1_2018" },
      { target: "IS 1757 (Part 1):2014", title: "Charpy pendulum impact test for metallic materials", type: "Test Method", page: 2, is_indexed: true, standard_id: "IS_1757_Part_1_2014" },
      { target: "IS 800:2007", title: "General Construction in Steel — Code of Practice", type: "Allied Standard", page: 3, is_indexed: true, standard_id: "IS_800_2007" }
    ],
    allied_standards: [
      { standard_id: "IS_800_2007", is_number: "IS 800:2007", title: "General Construction in Steel — Code of Practice", relationship: "Parent Structural Design Standard", relationship_type: "normative_reference" },
      { standard_id: "IS_1608_Part_1_2018", is_number: "IS 1608 (Part 1):2018", title: "Metallic materials — Tensile testing", relationship: "Test Method Standard", relationship_type: "test_method" },
      { standard_id: "IS_1757_Part_1_2014", is_number: "IS 1757 (Part 1):2014", title: "Charpy Impact Test on Steels", relationship: "Impact Test Protocol", relationship_type: "test_method" }
    ],
    conformity: {
      qco_applicable: "APPLICABLE",
      qco_status_label: "MANDATORY QCO IN FORCE",
      qco_reference: "Steel and Steel Products (Quality Control) Order, Ministry of Steel Gazette S.O. 2482(E)",
      effective_date: "2018-08-13",
      certification_required: "Mandatory BIS Certification Scheme I",
      certification_scheme: "Scheme I (Conformity Assessment Regulations, 2018)",
      bis_licence_required: "Mandatory: No producer may manufacture or sell structural steel without BIS Licence",
      coc_required: "Mill Test Certificate (MTC) with BIS Licence Number (CM/L-XXXXXXXXXX)",
      standard_mark_required: "Mandatory Standard ISI Mark stenciled or punched on every beam, plate, and bundle",
      marking_requirements: "Manufacturer name/brand, Grade (e.g. E250 A), Cast number, Size/thickness, ISI Mark",
      inspection_requirements: "Factory production control audit plus third-party surveillance testing by BIS",
      sampling_requirements: "One test sample per cast or every 50 tonnes of rolled product",
      testing_requirements: "Full ladle chemical analysis, tensile test, bend test, Charpy impact test"
    },
    version_history: {
      current_version: "IS 2062:2011",
      edition_info: "Seventh Revision",
      review_status: "CURRENT",
      timeline: [
        { year: "1962", label: "IS 226 (Original)", status: "SUPERSEDED", note: "Standard for structural steel" },
        { year: "1999", label: "Fifth Revision", status: "SUPERSEDED", note: "Unified weldable steel standard" },
        { year: "2006", label: "Sixth Revision", status: "SUPERSEDED", note: "Added high tensile designations" },
        { year: "2011", label: "Seventh Revision", status: "CURRENT", note: "Reaffirmed 2021 — Active Indian Standard" }
      ]
    }
  }
};

/**
 * Fallback standards catalog listing when backend /standards endpoint is missing.
 */
export const MOCK_STANDARDS_LIST = [
  {
    standard_id: "IS_1448_Part_97_2026",
    is_number: "IS 1448 (Part 97):2026",
    title: "Petroleum and Its Products — Methods of Test — Part 97 Determination of Thermal Oxidation Stability of Gas Turbine Fuels",
    edition_year: 2026,
    revision: "2nd Rev",
    status: "CURRENT",
    ics_code: "75.160.20",
    department: "PCD 03 — Petroleum Products & Related Materials",
    page_count: 28,
    relevance_hint: "Thermal oxidation stability, JFTOT apparatus, aviation turbine fuels"
  },
  {
    standard_id: "IS_2062_2011",
    is_number: "IS 2062:2011",
    title: "Hot Rolled Medium and High Tensile Structural Steel — Specification",
    edition_year: 2011,
    revision: "7th Rev",
    status: "CURRENT",
    ics_code: "77.140.01",
    department: "MTD 04 — Steel and Steel Products",
    page_count: 24,
    relevance_hint: "Structural steel plates, sections, E250/E350 grades, tensile yield strength"
  },
  {
    standard_id: "IS_456_2000",
    is_number: "IS 456:2000",
    title: "Plain and Reinforced Concrete — Code of Practice",
    edition_year: 2000,
    revision: "4th Rev",
    status: "CURRENT",
    ics_code: "91.100.30",
    department: "CED 02 — Cement and Concrete",
    page_count: 114,
    relevance_hint: "Concrete design, minimum cement content, cover, durability, characteristic strength"
  },
  {
    standard_id: "IS_800_2007",
    is_number: "IS 800:2007",
    title: "General Construction in Steel — Code of Practice",
    edition_year: 2007,
    revision: "3rd Rev",
    status: "CURRENT",
    ics_code: "91.080.10",
    department: "CED 07 — Structural Engineering and Structural Sections",
    page_count: 154,
    relevance_hint: "Limit state design of steel structures, connection detailing, beam-columns"
  },
  {
    standard_id: "IS_12633_2026",
    is_number: "IS 12633:2026",
    title: "Guidelines for Planning and Design of Canal Cross Regulators and Escapes",
    edition_year: 2026,
    revision: "1st Rev",
    status: "CURRENT",
    ics_code: "93.160",
    department: "WRD 13 — Water Resources Development",
    page_count: 36,
    relevance_hint: "Canal hydraulics, cross-regulators, discharge capacity, scouring depth"
  },
  {
    standard_id: "IS_17874_Part_2_2026",
    is_number: "IS 17874 (Part 2):2026",
    title: "Health Informatics — Point-of-Care Medical Device Communication — Part 2 Application Profiles",
    edition_year: 2026,
    revision: "1st Rev",
    status: "CURRENT",
    ics_code: "01.040.11, 11.020.99",
    department: "MHD 17 — Health Informatics",
    page_count: 42,
    relevance_hint: "Medical device telemetry, DICOM/HL7 interface, intensive care monitors"
  }
];
