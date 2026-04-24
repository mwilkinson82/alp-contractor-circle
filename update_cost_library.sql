-- ============================================================================
-- Cost Library Update — Accurate Residential Construction Pricing
-- Based on 2024-2025 RS Means Residential data, national average
-- All materialCost values in CENTS (e.g., $3.50 = 350)
-- All baseLaborCost values in CENTS
-- ============================================================================

-- ─── PART 1: UPDATE UNDERPRICED EXISTING ITEMS ─────────────────────────────

-- Painting (Div 09) — currently way too low
UPDATE expanded_cost_library SET materialCost = 85 WHERE description = 'Interior Paint (per SF)';
UPDATE expanded_cost_library SET materialCost = 85 WHERE description = 'Paint (material per SF)';
UPDATE expanded_cost_library SET materialCost = 125 WHERE description = 'Exterior Paint/Coating (per SF)';

UPDATE expanded_labor_library SET baseLaborCost = 225 WHERE description = 'Interior Painting (2 coats)';
UPDATE expanded_labor_library SET baseLaborCost = 275 WHERE description = 'Exterior Painting (2 coats)';

-- Drywall (Div 09)
UPDATE expanded_cost_library SET materialCost = 75 WHERE description = '1/2" Drywall/GWB (per SF)';
UPDATE expanded_cost_library SET materialCost = 75 WHERE description = '1/2" Gypsum Wallboard (material per SF)';
UPDATE expanded_cost_library SET materialCost = 85 WHERE description = '5/8" Drywall/GWB (per SF)';
UPDATE expanded_cost_library SET materialCost = 85 WHERE description = '5/8" Gypsum Wallboard (material per SF)';
UPDATE expanded_cost_library SET materialCost = 350 WHERE description = 'Gypsum Board Ceiling (per SF)';

UPDATE expanded_labor_library SET baseLaborCost = 165 WHERE description = 'Drywall — Hang';
UPDATE expanded_labor_library SET baseLaborCost = 135 WHERE description = 'Drywall — Tape & Finish (Level 4)';

-- Stucco (Div 09)
UPDATE expanded_cost_library SET materialCost = 450 WHERE description = 'Stucco/Plaster Finish (per SF)';
UPDATE expanded_cost_library SET materialCost = 350 WHERE description = 'Gypsum Plaster/Stucco (material per SF)';

-- Tile (Div 09) — increase to realistic installed rates
UPDATE expanded_cost_library SET materialCost = 950 WHERE description = 'Porcelain Tile (material per SF)';
UPDATE expanded_cost_library SET materialCost = 650 WHERE description = 'Ceramic Tile (material per SF)';
UPDATE expanded_cost_library SET materialCost = 750 WHERE description = 'Ceramic/Porcelain Floor Tile (per SF)';
UPDATE expanded_cost_library SET materialCost = 850 WHERE description = 'Ceramic/Porcelain Wall Tile (per SF)';

-- Flooring (Div 09)
UPDATE expanded_cost_library SET materialCost = 850 WHERE description = 'Hardwood Flooring (per SF)';
UPDATE expanded_cost_library SET materialCost = 500 WHERE description = 'Luxury Vinyl Plank (material per SF)';
UPDATE expanded_cost_library SET materialCost = 475 WHERE description = 'Luxury Vinyl Plank (LVP) Flooring (per SF)';

-- Spray Foam Insulation (Div 07)
UPDATE expanded_cost_library SET materialCost = 385 WHERE description = 'Spray Foam Insulation (per SF)';
UPDATE expanded_cost_library SET materialCost = 385 WHERE description = 'Spray Foam Insulation (material per SF)';

-- Batt Insulation (Div 07)
UPDATE expanded_cost_library SET materialCost = 125 WHERE description = 'R-19 Batt Insulation (per SF)';
UPDATE expanded_cost_library SET materialCost = 185 WHERE description = 'R-38 Batt Insulation (per SF)';
UPDATE expanded_cost_library SET materialCost = 115 WHERE description = 'Batt Insulation (material per SF)';

-- Framing lumber — slight increases
UPDATE expanded_cost_library SET materialCost = 85 WHERE description = '2x4 Framing Lumber (per LF)';
UPDATE expanded_cost_library SET materialCost = 125 WHERE description = '2x6 Framing Lumber (per LF)';
UPDATE expanded_cost_library SET materialCost = 165 WHERE description = '2x8 Framing Lumber (per LF)';
UPDATE expanded_cost_library SET materialCost = 215 WHERE description = '2x10 Framing Lumber (per LF)';
UPDATE expanded_cost_library SET materialCost = 285 WHERE description = '2x12 Framing Lumber (per LF)';

-- Roofing tiles — increase
UPDATE expanded_cost_library SET materialCost = 450 WHERE description LIKE '%Concrete S-Tile%' AND csiDivision = '07';

-- ─── PART 2: INSERT MISSING COMMON RESIDENTIAL ITEMS ───────────────────────

-- Painting — additional items
INSERT INTO expanded_cost_library (costItemId, csiDivision, csiCode, description, unit, materialCost, category, keywords, excludeKeywords, synonyms, isOriginal)
VALUES
('paint-primer-1coat', '09', '09 90 00', 'Primer, 1 coat (walls/ceiling)', 'SF', 35, 'finishes', '["primer"]', NULL, '["primer coat","prime coat","primer application","wall primer","ceiling primer","PVA primer","drywall primer"]', 0),
('paint-interior-3coat', '09', '09 90 00', 'Interior Latex Paint, 1 coat primer + 2 coats finish', 'SF', 120, 'finishes', '["paint","interior","latex"]', NULL, '["interior latex paint","interior paint 3 coat","primer and 2 coats","1 primer 2 finish coats","interior wall paint","ceiling paint","latex wall paint","interior painting complete"]', 0),
('paint-exterior-3coat', '09', '09 90 00', 'Exterior Paint, 1 coat primer + 2 coats finish', 'SF', 165, 'finishes', '["paint","exterior"]', NULL, '["exterior paint","exterior house paint","exterior latex paint","exterior painting complete","exterior wall paint","siding paint"]', 0),
('paint-trim', '09', '09 90 00', 'Trim/Baseboard Paint, 2 coats', 'LF', 85, 'finishes', '["paint","trim"]', NULL, '["trim paint","baseboard paint","crown paint","casing paint","door frame paint","window frame paint","trim painting"]', 0),
('paint-door', '09', '09 90 00', 'Door Paint, 2 coats (per door)', 'EA', 4500, 'finishes', '["paint","door"]', NULL, '["door painting","paint door","door paint 2 coats","interior door paint","exterior door paint"]', 0),
('paint-cabinet', '09', '09 90 00', 'Cabinet Paint/Refinish', 'LF', 6500, 'finishes', '["paint","cabinet"]', NULL, '["cabinet painting","cabinet refinish","paint cabinets","kitchen cabinet paint"]', 0);

-- Painting labor
INSERT INTO expanded_labor_library (laborItemId, csiDivision, csiCode, description, unit, baseLaborCost, crewSize, productivity, category, synonyms, isOriginal)
VALUES
('lab-paint-int-3coat', '09', '09 90 00', 'Interior Painting (primer + 2 coats)', 'SF', 225, 2, 200, 'finishes', '["interior painting","wall painting","ceiling painting","latex painting"]', 0),
('lab-paint-ext-3coat', '09', '09 90 00', 'Exterior Painting (primer + 2 coats)', 'SF', 300, 2, 150, 'finishes', '["exterior painting","house painting","siding painting"]', 0),
('lab-paint-trim', '09', '09 90 00', 'Trim/Baseboard Painting', 'LF', 150, 1, 100, 'finishes', '["trim painting","baseboard painting","casing painting"]', 0);

-- Drywall — additional items
INSERT INTO expanded_cost_library (costItemId, csiDivision, csiCode, description, unit, materialCost, category, keywords, excludeKeywords, synonyms, isOriginal)
VALUES
('drywall-complete', '09', '09 20 00', 'Drywall Complete (hang, tape, finish Level 4)', 'SF', 85, 'finishes', '["drywall","complete"]', NULL, '["drywall installed","gypsum board installed","sheetrock installed","drywall hang tape finish","drywall complete system","wallboard complete"]', 0),
('drywall-texture', '09', '09 20 00', 'Drywall Texture (knockdown/orange peel)', 'SF', 45, 'finishes', '["texture","knockdown"]', NULL, '["wall texture","ceiling texture","knockdown texture","orange peel texture","skip trowel","drywall texture"]', 0),
('corner-bead', '09', '09 20 00', 'Corner Bead, metal or vinyl', 'LF', 65, 'finishes', '["corner","bead"]', NULL, '["corner bead","drywall corner bead","metal corner bead","vinyl corner bead","outside corner"]', 0);

INSERT INTO expanded_labor_library (laborItemId, csiDivision, csiCode, description, unit, baseLaborCost, crewSize, productivity, category, synonyms, isOriginal)
VALUES
('lab-drywall-complete', '09', '09 20 00', 'Drywall Complete (hang + tape + finish)', 'SF', 300, 2, 150, 'finishes', '["drywall installation","sheetrock installation","gypsum board installation"]', 0),
('lab-drywall-texture', '09', '09 20 00', 'Drywall Texture Application', 'SF', 75, 1, 300, 'finishes', '["texture application","knockdown application","wall texturing"]', 0);

-- Trim/Millwork (Div 06)
INSERT INTO expanded_cost_library (costItemId, csiDivision, csiCode, description, unit, materialCost, category, keywords, excludeKeywords, synonyms, isOriginal)
VALUES
('baseboard-std', '06', '06 20 00', 'Baseboard/Base Trim, standard profile', 'LF', 225, 'wood', '["baseboard","base trim"]', NULL, '["baseboard","base trim","base molding","floor trim","MDF baseboard","wood baseboard","baseboard molding"]', 0),
('crown-molding', '06', '06 20 00', 'Crown Molding', 'LF', 350, 'wood', '["crown","molding"]', NULL, '["crown molding","crown moulding","cornice molding","ceiling molding","decorative crown"]', 0),
('door-casing', '06', '06 20 00', 'Door/Window Casing Trim', 'LF', 185, 'wood', '["casing","trim"]', NULL, '["door casing","window casing","door trim","window trim","casing trim","architrave"]', 0),
('chair-rail', '06', '06 20 00', 'Chair Rail Molding', 'LF', 275, 'wood', '["chair","rail"]', NULL, '["chair rail","chair rail molding","wainscot cap","dado rail"]', 0),
('shoe-molding', '06', '06 20 00', 'Shoe Molding/Quarter Round', 'LF', 85, 'wood', '["shoe","quarter round"]', NULL, '["shoe molding","quarter round","base shoe","floor molding"]', 0);

INSERT INTO expanded_labor_library (laborItemId, csiDivision, csiCode, description, unit, baseLaborCost, crewSize, productivity, category, synonyms, isOriginal)
VALUES
('lab-baseboard', '06', '06 20 00', 'Baseboard Installation', 'LF', 275, 1, 80, 'wood', '["baseboard install","base trim install","floor trim install"]', 0),
('lab-crown', '06', '06 20 00', 'Crown Molding Installation', 'LF', 425, 1, 50, 'wood', '["crown molding install","crown install","cornice install"]', 0),
('lab-casing', '06', '06 20 00', 'Door/Window Casing Installation', 'LF', 225, 1, 80, 'wood', '["casing install","trim install","door trim install"]', 0);

-- Countertops (Div 12)
INSERT INTO expanded_cost_library (costItemId, csiDivision, csiCode, description, unit, materialCost, category, keywords, excludeKeywords, synonyms, isOriginal)
VALUES
('countertop-granite', '12', '12 36 00', 'Granite Countertop, 3cm slab', 'SF', 6500, 'furnishings', '["granite","countertop"]', NULL, '["granite countertop","granite counter","granite slab","natural stone countertop","granite kitchen counter"]', 0),
('countertop-quartz', '12', '12 36 00', 'Quartz Countertop (Caesarstone/Silestone)', 'SF', 7500, 'furnishings', '["quartz","countertop"]', NULL, '["quartz countertop","quartz counter","engineered stone countertop","caesarstone","silestone","cambria"]', 0),
('countertop-marble', '12', '12 36 00', 'Marble Countertop', 'SF', 9500, 'furnishings', '["marble","countertop"]', NULL, '["marble countertop","marble counter","marble slab","calacatta","carrara countertop"]', 0),
('countertop-laminate', '12', '12 36 00', 'Laminate Countertop', 'SF', 2500, 'furnishings', '["laminate","countertop"]', NULL, '["laminate countertop","formica countertop","plastic laminate counter"]', 0);

INSERT INTO expanded_labor_library (laborItemId, csiDivision, csiCode, description, unit, baseLaborCost, crewSize, productivity, category, synonyms, isOriginal)
VALUES
('lab-countertop', '12', '12 36 00', 'Countertop Installation', 'SF', 2500, 2, 40, 'furnishings', '["countertop install","counter install","slab install"]', 0);

-- Shower/Tub (Div 22/09)
INSERT INTO expanded_cost_library (costItemId, csiDivision, csiCode, description, unit, materialCost, category, keywords, excludeKeywords, synonyms, isOriginal)
VALUES
('shower-tile-surround', '09', '09 30 00', 'Tile Shower Surround', 'SF', 1200, 'finishes', '["shower","tile","surround"]', NULL, '["tile shower surround","shower tile","shower wall tile","bathroom tile surround","tub surround tile"]', 0),
('shower-pan', '22', '22 40 00', 'Shower Pan/Base, mortar bed', 'EA', 85000, 'plumbing', '["shower","pan","base"]', NULL, '["shower pan","shower base","mortar shower pan","tile-ready shower base","shower floor"]', 0),
('bathtub-std', '22', '22 40 00', 'Bathtub, standard acrylic/fiberglass', 'EA', 65000, 'plumbing', '["bathtub","tub"]', NULL, '["bathtub","bath tub","soaking tub","acrylic tub","fiberglass tub","standard bathtub"]', 0),
('bathtub-freestanding', '22', '22 40 00', 'Bathtub, freestanding', 'EA', 250000, 'plumbing', '["bathtub","freestanding"]', NULL, '["freestanding tub","freestanding bathtub","soaker tub","clawfoot tub"]', 0);

-- Garage Door (Div 08)
INSERT INTO expanded_cost_library (costItemId, csiDivision, csiCode, description, unit, materialCost, category, keywords, excludeKeywords, synonyms, isOriginal)
VALUES
('garage-door-single', '08', '08 36 00', 'Garage Door, single (9x7)', 'EA', 125000, 'openings', '["garage","door","single"]', NULL, '["single garage door","9x7 garage door","1-car garage door","garage overhead door"]', 0),
('garage-door-double', '08', '08 36 00', 'Garage Door, double (16x7)', 'EA', 225000, 'openings', '["garage","door","double"]', NULL, '["double garage door","16x7 garage door","2-car garage door","two car garage door"]', 0),
('garage-door-opener', '08', '08 36 00', 'Garage Door Opener, chain drive', 'EA', 35000, 'openings', '["garage","opener"]', NULL, '["garage door opener","automatic garage door","garage door motor","overhead door opener"]', 0);

INSERT INTO expanded_labor_library (laborItemId, csiDivision, csiCode, description, unit, baseLaborCost, crewSize, productivity, category, synonyms, isOriginal)
VALUES
('lab-garage-door', '08', '08 36 00', 'Garage Door Installation', 'EA', 45000, 2, 2, 'openings', '["garage door install","overhead door install"]', 0);

-- Gutters/Downspouts (Div 07)
INSERT INTO expanded_cost_library (costItemId, csiDivision, csiCode, description, unit, materialCost, category, keywords, excludeKeywords, synonyms, isOriginal)
VALUES
('gutter-aluminum', '07', '07 71 00', 'Aluminum Gutter, 5" K-style', 'LF', 450, 'thermal', '["gutter","aluminum"]', NULL, '["aluminum gutter","K-style gutter","seamless gutter","rain gutter","5 inch gutter","house gutter"]', 0),
('downspout', '07', '07 71 00', 'Downspout, aluminum', 'LF', 350, 'thermal', '["downspout"]', NULL, '["downspout","rain downspout","gutter downspout","aluminum downspout","leader pipe"]', 0);

INSERT INTO expanded_labor_library (laborItemId, csiDivision, csiCode, description, unit, baseLaborCost, crewSize, productivity, category, synonyms, isOriginal)
VALUES
('lab-gutter', '07', '07 71 00', 'Gutter Installation', 'LF', 350, 2, 100, 'thermal', '["gutter install","gutter hanging","seamless gutter install"]', 0);

-- Appliances (Div 11)
INSERT INTO expanded_cost_library (costItemId, csiDivision, csiCode, description, unit, materialCost, category, keywords, excludeKeywords, synonyms, isOriginal)
VALUES
('appliance-range', '11', '11 30 00', 'Range/Oven, standard', 'EA', 125000, 'equipment', '["range","oven","stove"]', NULL, '["range","oven","stove","cooktop and oven","kitchen range","gas range","electric range"]', 0),
('appliance-dishwasher', '11', '11 30 00', 'Dishwasher, standard', 'EA', 75000, 'equipment', '["dishwasher"]', NULL, '["dishwasher","dish washer","kitchen dishwasher"]', 0),
('appliance-refrigerator', '11', '11 30 00', 'Refrigerator, standard', 'EA', 150000, 'equipment', '["refrigerator","fridge"]', NULL, '["refrigerator","fridge","kitchen refrigerator","french door refrigerator"]', 0),
('appliance-microwave', '11', '11 30 00', 'Microwave, built-in/over-range', 'EA', 45000, 'equipment', '["microwave"]', NULL, '["microwave","over range microwave","built-in microwave","microwave oven"]', 0),
('appliance-washer', '11', '11 30 00', 'Washing Machine', 'EA', 85000, 'equipment', '["washer","washing"]', NULL, '["washing machine","washer","clothes washer","laundry washer"]', 0),
('appliance-dryer', '11', '11 30 00', 'Dryer', 'EA', 75000, 'equipment', '["dryer"]', NULL, '["dryer","clothes dryer","laundry dryer"]', 0),
('appliance-hood', '11', '11 30 00', 'Range Hood/Vent Hood', 'EA', 55000, 'equipment', '["hood","vent hood","range hood"]', NULL, '["range hood","vent hood","kitchen hood","exhaust hood","cooktop hood"]', 0);

-- Rough Carpentry / Wall Framing as assembly (Div 06)
INSERT INTO expanded_cost_library (costItemId, csiDivision, csiCode, description, unit, materialCost, category, keywords, excludeKeywords, synonyms, isOriginal)
VALUES
('wall-framing-ext', '06', '06 10 00', 'Exterior Wall Framing, 2x6 16" O.C. (complete assembly)', 'SF', 550, 'wood', '["wall","framing","exterior"]', NULL, '["exterior wall framing","2x6 wall framing","exterior framing","wall frame assembly","exterior stud wall","perimeter wall framing"]', 0),
('wall-framing-int', '06', '06 10 00', 'Interior Wall Framing, 2x4 16" O.C. (complete assembly)', 'SF', 425, 'wood', '["wall","framing","interior"]', NULL, '["interior wall framing","2x4 wall framing","interior framing","partition wall framing","interior stud wall","partition framing"]', 0),
('roof-framing', '06', '06 10 00', 'Roof Framing/Trusses (installed)', 'SF', 650, 'wood', '["roof","framing","truss"]', NULL, '["roof framing","roof truss","truss installation","roof structure","rafter framing","roof truss system"]', 0),
('floor-framing', '06', '06 10 00', 'Floor Framing System (joists + subfloor)', 'SF', 575, 'wood', '["floor","framing","joist"]', NULL, '["floor framing","floor joist","subfloor system","floor structure","joist system","floor deck"]', 0),
('sheathing-wall', '06', '06 10 00', 'Wall Sheathing, OSB/plywood', 'SF', 185, 'wood', '["sheathing","wall"]', NULL, '["wall sheathing","OSB sheathing","plywood sheathing","structural sheathing","wall board"]', 0),
('sheathing-roof', '06', '06 10 00', 'Roof Sheathing, plywood/OSB', 'SF', 225, 'wood', '["sheathing","roof"]', NULL, '["roof sheathing","roof deck","plywood roof deck","OSB roof sheathing","roof board"]', 0),
('subfloor-plywood', '06', '06 10 00', 'Subfloor, 3/4" T&G plywood', 'SF', 285, 'wood', '["subfloor","plywood"]', NULL, '["subfloor","plywood subfloor","tongue and groove subfloor","T&G plywood","floor deck plywood","AdvanTech subfloor"]', 0);

INSERT INTO expanded_labor_library (laborItemId, csiDivision, csiCode, description, unit, baseLaborCost, crewSize, productivity, category, synonyms, isOriginal)
VALUES
('lab-wall-framing', '06', '06 10 00', 'Wall Framing (complete assembly)', 'SF', 450, 3, 80, 'wood', '["wall framing","stud wall framing","partition framing"]', 0),
('lab-roof-framing', '06', '06 10 00', 'Roof Framing/Truss Installation', 'SF', 500, 4, 60, 'wood', '["roof framing","truss install","rafter install"]', 0),
('lab-floor-framing', '06', '06 10 00', 'Floor Framing Installation', 'SF', 425, 3, 80, 'wood', '["floor framing","joist install","subfloor install"]', 0),
('lab-sheathing', '06', '06 10 00', 'Sheathing Installation', 'SF', 175, 2, 120, 'wood', '["sheathing install","OSB install","plywood install"]', 0);

-- Stucco — proper 3-coat system (Div 09)
INSERT INTO expanded_cost_library (costItemId, csiDivision, csiCode, description, unit, materialCost, category, keywords, excludeKeywords, synonyms, isOriginal)
VALUES
('stucco-3coat', '09', '09 20 00', 'Stucco, 3-coat system (scratch, brown, finish)', 'SF', 450, 'finishes', '["stucco","3 coat"]', NULL, '["3 coat stucco","three coat stucco","traditional stucco","cement stucco","stucco system","exterior stucco","stucco finish","portland cement stucco"]', 0),
('stucco-1coat', '09', '09 20 00', 'Stucco, 1-coat synthetic/EIFS', 'SF', 350, 'finishes', '["stucco","synthetic","EIFS"]', NULL, '["synthetic stucco","EIFS","one coat stucco","acrylic stucco","exterior insulation finish system"]', 0);

INSERT INTO expanded_labor_library (laborItemId, csiDivision, csiCode, description, unit, baseLaborCost, crewSize, productivity, category, synonyms, isOriginal)
VALUES
('lab-stucco-3coat', '09', '09 20 00', 'Stucco Application, 3-coat', 'SF', 550, 3, 60, 'finishes', '["stucco application","stucco install","plaster application"]', 0);

-- Tile labor (Div 09)
INSERT INTO expanded_labor_library (laborItemId, csiDivision, csiCode, description, unit, baseLaborCost, crewSize, productivity, category, synonyms, isOriginal)
VALUES
('lab-tile-floor', '09', '09 30 00', 'Floor Tile Installation', 'SF', 650, 2, 40, 'finishes', '["tile install","floor tile install","ceramic tile install","porcelain tile install"]', 0),
('lab-tile-wall', '09', '09 30 00', 'Wall Tile Installation', 'SF', 800, 2, 30, 'finishes', '["wall tile install","shower tile install","backsplash tile install"]', 0),
('lab-tile-backsplash', '09', '09 30 00', 'Backsplash Tile Installation', 'SF', 900, 1, 25, 'finishes', '["backsplash install","kitchen backsplash","tile backsplash"]', 0);

-- Flooring labor (Div 09)
INSERT INTO expanded_labor_library (laborItemId, csiDivision, csiCode, description, unit, baseLaborCost, crewSize, productivity, category, synonyms, isOriginal)
VALUES
('lab-hardwood-floor', '09', '09 60 00', 'Hardwood Flooring Installation', 'SF', 450, 2, 60, 'finishes', '["hardwood install","wood floor install","hardwood flooring install"]', 0),
('lab-lvp-floor', '09', '09 60 00', 'LVP/Vinyl Plank Installation', 'SF', 250, 2, 100, 'finishes', '["LVP install","vinyl plank install","luxury vinyl install"]', 0);

-- Fire Sprinkler — residential per SF (Div 21)
INSERT INTO expanded_cost_library (costItemId, csiDivision, csiCode, description, unit, materialCost, category, keywords, excludeKeywords, synonyms, isOriginal)
VALUES
('fire-sprinkler-res', '21', '21 10 00', 'Residential Fire Sprinkler System (per SF of protected area)', 'SF', 250, 'fire', '["sprinkler","fire","residential"]', NULL, '["residential fire sprinkler","fire sprinkler system","automatic sprinkler","home fire sprinkler","NFPA 13D sprinkler"]', 0);

INSERT INTO expanded_labor_library (laborItemId, csiDivision, csiCode, description, unit, baseLaborCost, crewSize, productivity, category, synonyms, isOriginal)
VALUES
('lab-fire-sprinkler-res', '21', '21 10 00', 'Residential Fire Sprinkler Installation', 'SF', 200, 2, 80, 'fire', '["fire sprinkler install","sprinkler system install"]', 0);

-- Waterproofing (Div 07)
INSERT INTO expanded_cost_library (costItemId, csiDivision, csiCode, description, unit, materialCost, category, keywords, excludeKeywords, synonyms, isOriginal)
VALUES
('waterproof-membrane', '07', '07 10 00', 'Waterproofing Membrane, below grade', 'SF', 350, 'thermal', '["waterproof","membrane"]', NULL, '["waterproofing membrane","below grade waterproofing","foundation waterproofing","basement waterproofing","dampproofing"]', 0),
('housewrap', '07', '07 25 00', 'House Wrap / Weather Barrier (Tyvek)', 'SF', 55, 'thermal', '["house wrap","Tyvek","weather barrier"]', NULL, '["house wrap","Tyvek","weather resistant barrier","WRB","building wrap","air barrier"]', 0);

-- Sod/Landscaping (Div 32)
INSERT INTO expanded_cost_library (costItemId, csiDivision, csiCode, description, unit, materialCost, category, keywords, excludeKeywords, synonyms, isOriginal)
VALUES
('sod', '32', '32 92 00', 'Sod, installed', 'SF', 65, 'exterior', '["sod","grass"]', NULL, '["sod","sod installation","grass sod","lawn sod","turf sod","bermuda sod","st augustine sod","zoysia sod"]', 0),
('landscape-mulch', '32', '32 92 00', 'Landscape Mulch', 'SF', 45, 'exterior', '["mulch"]', NULL, '["mulch","landscape mulch","bark mulch","wood mulch","decorative mulch"]', 0),
('irrigation-system', '32', '32 80 00', 'Irrigation System, residential', 'SF', 185, 'exterior', '["irrigation","sprinkler"]', NULL, '["irrigation system","lawn sprinkler system","automatic irrigation","sprinkler system","landscape irrigation"]', 0);

-- Interior Doors (Div 08)
INSERT INTO expanded_cost_library (costItemId, csiDivision, csiCode, description, unit, materialCost, category, keywords, excludeKeywords, synonyms, isOriginal)
VALUES
('door-interior-hollow', '08', '08 10 00', 'Interior Door, hollow core, pre-hung', 'EA', 22500, 'openings', '["door","interior","hollow"]', NULL, '["interior door","hollow core door","bedroom door","closet door","pre-hung interior door","passage door"]', 0),
('door-interior-solid', '08', '08 10 00', 'Interior Door, solid core, pre-hung', 'EA', 45000, 'openings', '["door","interior","solid"]', NULL, '["solid core door","solid interior door","solid wood door","pre-hung solid door"]', 0),
('door-exterior-entry', '08', '08 10 00', 'Exterior Entry Door, fiberglass/steel', 'EA', 85000, 'openings', '["door","exterior","entry"]', NULL, '["entry door","front door","exterior door","main entry door","fiberglass entry door","steel entry door"]', 0),
('door-sliding-glass', '08', '08 32 00', 'Sliding Glass Door, 6ft', 'EA', 125000, 'openings', '["sliding","glass","door"]', NULL, '["sliding glass door","patio door","slider door","glass patio door"]', 0),
('door-french', '08', '08 10 00', 'French Door, double', 'EA', 175000, 'openings', '["french","door"]', NULL, '["french door","french doors","double french door","patio french door"]', 0);

INSERT INTO expanded_labor_library (laborItemId, csiDivision, csiCode, description, unit, baseLaborCost, crewSize, productivity, category, synonyms, isOriginal)
VALUES
('lab-door-interior', '08', '08 10 00', 'Interior Door Installation (pre-hung)', 'EA', 17500, 1, 4, 'openings', '["door install","interior door install","hang door"]', 0),
('lab-door-exterior', '08', '08 10 00', 'Exterior Door Installation', 'EA', 35000, 2, 2, 'openings', '["exterior door install","entry door install","front door install"]', 0);

-- Closet Systems (Div 12)
INSERT INTO expanded_cost_library (costItemId, csiDivision, csiCode, description, unit, materialCost, category, keywords, excludeKeywords, synonyms, isOriginal)
VALUES
('closet-shelving', '12', '12 56 00', 'Closet Shelving System, wire', 'LF', 1500, 'furnishings', '["closet","shelving"]', NULL, '["closet shelving","wire shelving","closet organizer","closet system","shelf and rod"]', 0),
('closet-custom', '12', '12 56 00', 'Closet System, custom built-in', 'LF', 8500, 'furnishings', '["closet","custom"]', NULL, '["custom closet","built-in closet","closet built-in","walk-in closet system"]', 0);

-- Concrete Flatwork (Div 03)
INSERT INTO expanded_cost_library (costItemId, csiDivision, csiCode, description, unit, materialCost, category, keywords, excludeKeywords, synonyms, isOriginal)
VALUES
('concrete-patio', '03', '03 30 00', 'Concrete Patio/Walkway, 4" thick, broom finish', 'SF', 425, 'concrete', '["concrete","patio","walkway"]', NULL, '["concrete patio","concrete walkway","concrete sidewalk","broom finish concrete","flatwork concrete","exterior concrete slab"]', 0),
('concrete-driveway', '03', '03 30 00', 'Concrete Driveway, 4" thick', 'SF', 550, 'concrete', '["concrete","driveway"]', NULL, '["concrete driveway","driveway concrete","driveway slab","concrete drive"]', 0);

INSERT INTO expanded_labor_library (laborItemId, csiDivision, csiCode, description, unit, baseLaborCost, crewSize, productivity, category, synonyms, isOriginal)
VALUES
('lab-concrete-flatwork', '03', '03 30 00', 'Concrete Flatwork (place, finish, cure)', 'SF', 350, 4, 100, 'concrete', '["concrete flatwork","concrete pour","concrete finishing","slab pour"]', 0);

-- Window (Div 08) — update existing if too low
UPDATE expanded_cost_library SET materialCost = 55000 WHERE description LIKE '%Impact rated%vinyl windows%' AND materialCost < 50000;

-- Soundproofing membrane
UPDATE expanded_cost_library SET materialCost = 350 WHERE description LIKE '%Soundproofing Membrane%' AND materialCost < 300;

-- Pergola/Rafter Tails — these seem OK at current prices

-- ============================================================================
-- DONE — This adds ~50 new cost items and ~20 new labor items,
-- plus updates ~30+ underpriced existing items
-- ============================================================================
