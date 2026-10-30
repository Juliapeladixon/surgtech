"""
Load fictional sample data for development and demos.

    python manage.py seed_sample_data            # add / update sample rows (safe to re-run)
    python manage.py seed_sample_data --reset    # wipe ALL data first, then load

Every seeded user has the password:  Theatre#2026
All people, hospitals' staff and cards are invented for demonstration.
"""

import base64
from datetime import date, timedelta

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from cards.models import (
    CardAttachment, CardNote, Doctor, PreferenceCard, PreferenceCardItem,
    Procedure, Specialty, Surgeon, SurgicalInstrument, SurgicalPack, Suture, User,
)

PASSWORD = "Theatre#2026"

TINY_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
)

# ═════════════════════════════════════════════════════════════════════════════
#  Users, specialties, doctors
# ═════════════════════════════════════════════════════════════════════════════
USERS = [
    ("admin_chipo",   "Chipo",  "Mandaza", "RGN",         "ADMIN",  "+263771000001"),
    ("editor_tendai", "Tendai", "Mufunde", "OTN",         "EDITOR", "+263771000002"),
    ("scrub_farai",   "Farai",  "Gumbo",   "SCRUB_NURSE", "EDITOR", "+263771000003"),
    ("viewer_rudo",   "Rudo",   "Makoni",  "HCA",         "VIEWER", "+263771000004"),
]

SPECIALTIES = [
    ("ENT Surgery", "ENT"),
    ("General Surgery", "GEN"),
    ("Orthopaedic Surgery", "ORTHO"),
    ("Vascular Surgery", "VASC"),
    ("Urology", "URO"),
    ("Obstetrics & Gynaecology", "OBGYN"),
    ("Neurosurgery", "NEURO"),
    ("Cardiothoracic Surgery", "CTS"),
    ("Plastic & Reconstructive Surgery", "PLAST"),
    ("Paediatric Surgery", "PAED"),
    ("Ophthalmology", "OPH"),
    ("Maxillofacial Surgery", "MAXFAX"),
    ("Colorectal Surgery", "COLO"),
    ("Endocrine & Breast Surgery", "ENDO"),
    ("Trauma Surgery", "TRAUMA"),
    ("Hepatobiliary & Transplant", "HPB"),
    ("Dental Surgery", "DENT"),
]

# title, name, specialty, sub_specialty, practice, city, phone, group?, is_surgeon, display, glove
DOCTORS = [
    # --- original sample rows ---
    ("Mr", "Tafadzwa Machawira", "ENT Surgery", "Paediatric ENT", "Avenues Clinic", "Harare", "0242700001", False, True, "Mr Machawira", "7½"),
    ("Dr", "Sibusiso Ncube", "General Surgery", "Laparoscopic surgery", "Parirenyatwa Hospital", "Harare", "0242700002", False, True, "Dr Ncube", "8"),
    ("Prof", "Rutendo Moyo", "Orthopaedic Surgery", "Joint replacement", "Mpilo Central Hospital", "Bulawayo", "0292700003", True, True, "Prof Moyo", "7"),
    ("Mr", "Kudzai Chikwanha", "Vascular Surgery", "Venous disease", "Avenues Clinic", "Harare", "0242700004", False, True, "Mr Chikwanha", "8½"),
    ("Dr", "Nomsa Dube", "Urology", "Endourology", "Mpilo Central Hospital", "Bulawayo", "0292700005", False, True, "Dr Dube", "6½"),
    ("Dr", "Blessing Sithole", "Obstetrics & Gynaecology", "Obstetrics", "Parirenyatwa Hospital", "Harare", "0242700006", True, True, "Dr Sithole", "7"),
    ("Dr", "Anesu Zhou", "Ophthalmology", "Cataract", "Mutare Provincial Hospital", "Mutare", "0202700007", False, True, "Dr Zhou", "7"),
    ("Dr", "Linda Mutasa", "Paediatric Surgery", "", "Parirenyatwa Hospital", "Harare", "0242700008", False, True, "Dr Mutasa", "6½"),

    # --- General Surgery bulk ---
    ("Dr", "M Sachikonye", "General Surgery", "", "3 Julia Court, 7 Baines Ave", "Harare", "0772358338", False, True, "Dr Sachikonye", "7"),
    ("Dr", "M Wazara", "General Surgery", "", "3 Julia Court, 7 Baines Ave", "Harare", "0772229375", False, True, "Dr Wazara", "7"),
    ("Mr", "Chinyowa", "General Surgery", "", "26 Baines Avenue", "Harare", "0777066120", False, True, "Mr Chinyowa", "7½"),
    ("Dr", "I Dube", "General Surgery", "", "Suite 42, 3rd Floor, Medical Centre, Cnr Baines & L Takawira", "Harare", "0712325544", False, True, "Dr I Dube", "7"),
    ("Dr", "E Chitsika", "General Surgery", "", "56 Baines Avenue", "Harare", "0712421374", False, True, "Dr Chitsika", "7"),
    ("Dr", "P Karidza", "General Surgery", "", "123 Baines Ave Cnr 4th St", "Harare", "0778198686", False, True, "Dr Karidza", "7"),
    ("Dr", "A Chengahomwe", "General Surgery", "", "Suite 14 Westend Clinic", "Harare", "0772268120", False, True, "Dr Chengahomwe", "7"),
    ("Dr", "G Muguti", "General Surgery", "", "13 Baines Avenue", "Harare", "0712644565", False, True, "Dr G Muguti", "7"),
    ("Dr", "E G Muguti", "General Surgery", "", "52 Baines Avenue", "Harare", "", False, True, "Dr E G Muguti", "7"),
    ("Dr", "P S Machawira", "General Surgery", "Thoracic surgery", "143 Fife Ave", "Harare", "", False, True, "Dr P S Machawira", "7½"),
    ("Dr", "N Madziva", "General Surgery", "", "Suite 14 West End Clinic", "Harare", "0773935659", False, True, "Dr Madziva", "7"),
    ("Dr", "M Muriva", "General Surgery", "", "11 Sanlam Centre, Newlands", "Harare", "", False, True, "Dr Muriva", "7"),
    ("Dr", "J Marume", "General Surgery", "", "69 Central Ave", "Harare", "0779090947", False, True, "Dr Marume", "7"),
    ("Dr", "A Mukosi", "General Surgery", "", "Suite 4 West End Clinic Extension", "Harare", "", False, True, "Dr Mukosi", "7"),
    ("Dr", "B Mbuwayesango", "General Surgery", "", "155 King George, Avondale", "Harare", "0777139001", False, True, "Dr Mbuwayesango", "7"),
    ("Dr", "Zimunhu", "General Surgery", "", "Suite 401, 4th Floor Medical Centre", "Harare", "0712751888", False, True, "Dr Zimunhu", "7"),
    ("Dr", "Gwatirisa", "General Surgery", "", "90 Fife Avenue", "Harare", "0777139001", False, True, "Dr Gwatirisa", "7"),
    ("Dr", "W Mawoko", "General Surgery", "", "50 Harvey Brown, Milton Park", "Harare", "0772839787", False, True, "Dr Mawoko", "7"),
    ("Dr", "P Gonouya", "General Surgery", "", "155 King George, Avondale", "Harare", "9306", False, True, "Dr Gonouya", "7"),

    # --- ENT Surgery bulk ---
    ("Prof", "Clemence Chidziva", "ENT Surgery", "Paediatric ENT", "93 Josiah Chinamano / Parirenyatwa ENT", "Harare", "", False, True, "Prof Chidziva", "7"),
    ("Dr", "Erasmas Muganda", "ENT Surgery", "", "Private practice", "Harare", "", False, True, "Dr Muganda", "7"),
    ("Dr", "Naboth Matinhira", "ENT Surgery", "", "Citimed Hospital", "Chitungwiza", "0242702496 / 0771081463", False, True, "Dr Matinhira", "7"),
    ("Dr", "C G Tumushime-Buturo", "ENT Surgery", "", "Cnr Baines Ave / Harare St", "Harare", "04700251 / 04745185", False, True, "Dr Tumushime-Buturo", "7"),
    ("Dr", "Y Deng", "ENT Surgery", "", "Cnr 3rd St & Josiah Chinamano Ave", "Harare", "", False, True, "Dr Deng", "7"),
    ("Dr", "Titus Dzongodza", "ENT Surgery", "Paediatric ENT", "", "Harare", "", False, True, "Dr Dzongodza", "7"),
    ("Dr", "Annete Bongiwe Moyo", "ENT Surgery", "", "", "Harare", "", False, True, "Dr A B Moyo", "6½"),
    ("Mr", "The ENT Group Practice", "ENT Surgery", "Otology / Rhinology / Head & Neck", "Parirenyatwa / Private", "Harare", "", True, True, "ENT Group Practice", "7"),
    ("Dr", "P Maksimovitch", "ENT Surgery", "", "Room 2, Medical Centre, J Tongogara St", "Bulawayo", "09-882585 / 0912342465", False, True, "Dr Maksimovitch", "7"),

    # --- Cardiothoracic ---
    ("Dr", "Simukayi Percy Machawira", "Cardiothoracic Surgery", "Open-heart surgery", "Suite 10, Fife Avenue Medical Centre, 143 Fife Avenue / Parirenyatwa Cardiothoracic Unit", "Harare", "04-790489 / 0784536124 / 0772347190", False, True, "Dr S P Machawira", "7½"),
    ("Dr", "Wilfred Muteweye", "Cardiothoracic Surgery", "Trauma registry; atrial myxoma", "Avenues Clinic / Parirenyatwa", "Harare", "+263242701555", False, True, "Dr Muteweye", "7"),
    ("Dr", "Kudzai Kanyepi", "Cardiothoracic Surgery", "Uniportal VATS", "Avenues Clinic / Parirenyatwa", "Harare", "+263242251180 / 251600", False, True, "Dr Kanyepi", "6½"),
    ("Dr", "David Chimuka", "Cardiothoracic Surgery", "", "Parirenyatwa / West End Clinic", "Harare", "", False, True, "Dr Chimuka", "7"),

    # ═══════════════════════════════════════════════════════════════════════
    #  NEW — surgeons referenced by the added preference cards
    # ═══════════════════════════════════════════════════════════════════════
    ("Mr", "Tumushime", "ENT Surgery", "Otology / Head & Neck", "Parirenyatwa / Avenues Clinic", "Harare", "", False, True, "Mr Tumushime", "7½"),
    ("Dr", "Chidziva", "ENT Surgery", "Head & Neck / Laryngectomy", "Parirenyatwa", "Harare", "", False, True, "Dr Chidziva", "8"),
    ("Mr", "Gucama Tunhu", "Maxillofacial Surgery", "Oculoplastic / DCR", "Parirenyatwa / Private", "Harare", "", False, True, "Mr Gucama Tunhu", "7"),
    ("Dr", "Maiana", "Maxillofacial Surgery", "Dental surgery", "Parirenyatwa / Private", "Harare", "", False, True, "Dr Maiana", "7"),
    ("Prof", "Mudemwa", "Plastic & Reconstructive Surgery", "Breast surgery", "Avenues Clinic", "Harare", "", False, True, "Prof Mudemwa", "7"),
    ("Prof", "Muchamwa", "Plastic & Reconstructive Surgery", "Breast surgery", "Avenues Clinic", "Harare", "", False, True, "Prof Muchamwa", "7"),
    ("Mr", "Gova", "Orthopaedic Surgery", "Arthroscopy / Trauma", "Avenues Clinic", "Harare", "", False, True, "Mr Gova", "8"),
    ("Mr", "Nystigover", "Orthopaedic Surgery", "Trauma / Humerus", "Avenues Clinic", "Harare", "", False, True, "Mr Nystigover", "8"),
    ("Mr", "Kova", "Orthopaedic Surgery", "Trauma / Forearm", "Avenues Clinic", "Harare", "", False, True, "Mr Kova", "8"),
    # NEW (this round):
    ("Mr", "Grova", "Orthopaedic Surgery", "Pelvic / Acetabular trauma", "Avenues Clinic", "Harare", "", False, True, "Mr Grova", "8"),
    ("Mr", "Mlalazi", "Orthopaedic Surgery", "General ORIF / Trauma", "Avenues Clinic", "Harare", "", False, True, "Mr Mlalazi", "7½"),
]

# ═════════════════════════════════════════════════════════════════════════════
#  Procedures per specialty
# ═════════════════════════════════════════════════════════════════════════════
PROCEDURES = {
    "ENT Surgery": [
        ("Tonsillectomy", "Tonsil removal"),
        ("Grommet insertion", "Myringotomy; ear tubes"),
        ("Septoplasty", ""),
        ("Tympanoplasty", ""),
        ("Myringoplasty", "Myrelectomy (source text)"),
        ("Functional neck dissection", "FND; neck dissection"),
        ("Thyroidectomy", ""),
        ("Laryngectomy", "Total laryngectomy"),
    ],
    "General Surgery": [
        ("Laparoscopic cholecystectomy", "Lap chole; gallbladder removal"),
        ("Open appendicectomy", "Appendectomy"),
        ("Inguinal hernia repair (mesh)", "Lichtenstein repair"),
    ],
    "Orthopaedic Surgery": [
        ("Total hip replacement", "THR; hip arthroplasty"),
        ("ACL reconstruction", "Anterior cruciate ligament repair"),
        ("Arthroscopic procedure", "Knee/shoulder arthroscopy — verify specific"),
        ("ORIF ankle", "Open reduction internal fixation of ankle"),
        ("ORIF humerus", "Open reduction internal fixation of humerus"),
        ("ORIF radius", "Open reduction internal fixation of radius"),
        ("Achilles tendon repair", "Achilles tendon rupture repair"),
        ("Repair of acetabulum", "Acetabular fracture repair"),
        ("ORIF", "Open reduction internal fixation — general"),
    ],
    "Vascular Surgery": [("Varicose vein stripping", "VV strip; varicose vein stripping")],
    "Urology": [("TURP", "Transurethral resection of prostate"), ("Cystoscopy", "")],
    "Obstetrics & Gynaecology": [("Caesarean section", "C-section; LSCS"), ("Abdominal hysterectomy", "TAH")],
    "Neurosurgery": [("Burr hole drainage", "")],
    "Cardiothoracic Surgery": [("Chest drain insertion", "ICD insertion")],
    "Plastic & Reconstructive Surgery": [
        ("Split skin graft", "SSG"),
        ("Bilateral breast reduction", "Bilateral reduction mammoplasty"),
        ("Breast reduction (local anaesthesia)", "Reduction mammoplasty — local"),
    ],
    "Paediatric Surgery": [("Paediatric orchidopexy", "")],
    "Ophthalmology": [("Phacoemulsification", "Cataract surgery")],
    "Maxillofacial Surgery": [
        ("Mandible fracture fixation", ""),
        ("Dacryocystorhinostomy", "DCR"),
    ],
    "Dental Surgery": [("Disimpaction of tooth", "Third molar disimpaction")],
    "Colorectal Surgery": [("Haemorrhoidectomy", "Piles surgery")],
    "Endocrine & Breast Surgery": [("Total thyroidectomy", "")],
    "Trauma Surgery": [("Debridement and washout", "I&D")],
    "Hepatobiliary & Transplant": [("Liver resection", "")],
}

# ═════════════════════════════════════════════════════════════════════════════
#  Item lists
# ═════════════════════════════════════════════════════════════════════════════
# key: (material, size, item_type, needle_type, needle_mm, absorbable, expiry offset days)
SUTURES = {
    "silk_2_0_tie":         ("Silk",           "2/0", "Tie",            "None",       None, False, 600),
    "silk_3_0_tie":         ("Silk",           "3/0", "Tie",            "None",       None, False, 600),
    "silk_0_tie":           ("Silk",           "0",   "Tie",            "None",       None, False, 600),
    "silk_0_needled_cut":   ("Silk",           "0",   "Needled suture", "Cutting",      30, False, 600),
    "silk_2_0_needled_cut": ("Silk",           "2/0", "Needled suture", "Cutting",      26, False, 600),
    "vicryl_1_rb":          ("Vicryl",         "1",   "Needled suture", "Round body",   40, True,  500),
    "vicryl_2_0_rb":        ("Vicryl",         "2/0", "Needled suture", "Round body",   26, True,  500),
    "vicryl_3_0_cut":       ("Vicryl",         "3/0", "Needled suture", "Cutting",      24, True,  450),
    "vicryl_3_0_rb":        ("Vicryl",         "3/0", "Needled suture", "Round body",   24, True,  450),
    "monocryl_4_0":         ("Monocryl",       "4/0", "Needled suture", "Cutting",      19, True,  450),
    "monocryl_3_0_cut":     ("Monocryl",       "3/0", "Needled suture", "Cutting",      24, True,  450),
    "nylon_0":              ("Nylon",          "0",   "Needled suture", "Cutting",      30, False, 700),
    "nylon_2_0":            ("Nylon",          "2/0", "Needled suture", "Cutting",      26, False, 700),
    "nylon_3_0":            ("Nylon",          "3/0", "Needled suture", "Cutting",      24, False, 700),
    "nylon_3_0_small":      ("Nylon",          "3/0", "Needled suture", "Cutting",      18, False, 700),
    "prolene_2_0":          ("Prolene",        "2/0", "Needled suture", "Round body",   26, False, 700),
    "pds_1":                ("PDS II",         "1",   "Needled suture", "Round body",   48, True,  550),
    "pds_1_cutting":        ("PDS II",         "1",   "Needled suture", "Cutting",      40, True,  550),
    "chromic_2_0":          ("Chromic catgut", "2/0", "Needled suture", "Round body",   30, True,  400),
}

# key: (name, category, variant, reusable, condition)
INSTRUMENTS = {
    # --- original ---
    "dissect_toothed":       ("Dissecting forceps",              "Forceps",      "Toothed",            True,  "Sterile"),
    "dissect_plain":         ("Dissecting forceps",              "Forceps",      "Non-toothed",        True,  "Sterile"),
    "metz":                  ("Metzenbaum scissors",             "Scissors",     "Curved",             True,  "Sterile"),
    "mayo":                  ("Mayo scissors",                   "Scissors",     "Straight",           True,  "Sterile"),
    "spencer":               ("Spencer Wells artery forceps",    "Forceps",      "Curved",             True,  "Sterile"),
    "weitlaner":             ("Weitlaner retractor",             "Retractor",    "Self-retaining",     True,  "Sterile"),
    "langenbeck":            ("Langenbeck retractor",            "Retractor",    "",                   True,  "Sterile"),
    "yankauer":              ("Yankauer suction tip",            "Suction",      "",                   False, "Sterile"),
    "bipolar":               ("Bipolar forceps",                 "Diathermy",    "",                   True,  "In use"),
    "boyle_davis":           ("Boyle-Davis mouth gag",           "Retractor",    "With tongue blade",  True,  "Sterile"),
    "maryland":              ("Laparoscopic Maryland dissector", "Laparoscopic", "5mm",                True,  "Sterile"),
    "hemolok":               ("Hem-o-lok clip applier",          "Clip",         "Large",              False, "Sterile"),
    "tonsil_snare":          ("Tonsil dissector",                "Dissector",    "",                   True,  "Needs repair"),
    # --- DCR / MaxFax ---
    "mcdonald":              ("McDonald dissector",              "Dissector",    "",                   True,  "Sterile"),
    "crile":                 ("Crile forceps",                   "Forceps",      "Curved",             True,  "Sterile"),
    "baby_travers":          ("Baby Travers retractor",          "Retractor",    "",                   True,  "Sterile"),
    "penny_baker":           ("Penny Baker dissecting forceps",  "Forceps",      "Curved",             True,  "Sterile"),
    "gillies":               ("Gillies forceps",                 "Forceps",      "Toothed",            True,  "Sterile"),
    "adson_frazer":          ("Adson-Frazer suction",            "Suction",      "",                   False, "Sterile"),
    "periosteal_small":      ("Periosteal elevator (small)",     "Elevator",     "",                   True,  "Sterile"),
    "periosteal_large":      ("Periosteal elevator (large)",     "Elevator",     "",                   True,  "Sterile"),
    "rongeur":               ("Rongeur",                         "Bone",         "",                   True,  "Sterile"),
    "punch_3mm":             ("Punch 3mm",                       "Punch",        "",                   True,  "Sterile"),
    "cats_paw":              ("Cat's paw retractor",             "Retractor",    "",                   True,  "Sterile"),
    "mayo_towel_clip":       ("Mayo towel clip",                 "Clip",         "",                   True,  "Sterile"),
    # --- ENT ---
    "mastoidectomy_burr":    ("Mastoidectomy burr",              "Bone",         "",                   True,  "Sterile"),
    "tympanoplasty_hook":    ("Tympanoplasty hook",              "Hook",         "",                   True,  "Sterile"),
    # --- Plastic ---
    "toothed_addison":       ("Addison toothed forceps",         "Forceps",      "Toothed",            True,  "Sterile"),
    "nontoothed_addison":    ("Addison non-toothed forceps",     "Forceps",      "Non-toothed",        True,  "Sterile"),
    "lawrie_forceps":        ("Lawrie forceps",                  "Forceps",      "Straight",           True,  "Sterile"),
    "littlewood":            ("Littlewood tissue forceps",       "Forceps",      "Toothed",            True,  "Sterile"),
    "needle_holder_70mm":    ("Needle holder 70mm",              "Needle holder","Fr 14-16mm",         True,  "Sterile"),
    # --- Dental ---
    "dental_cartridge":      ("Dental cartridge",                "Dental",       "",                   False, "Sterile"),
    "dental_needle_27":      ("Dental needle 27G",               "Dental",       "",                   False, "Sterile"),
    "maxfac_drill":          ("Maxillofacial drill (Surgantown)", "Drill",       "",                   True,  "Sterile"),
    "throat_pack":           ("Throat pack",                     "Swab",         "",                   False, "Sterile"),
    "magils_forceps":        ("Magill forceps",                  "Forceps",      "",                   True,  "Sterile"),
    # --- Arthroscopy ---
    "arthroscopy_tray_only": ("Arthroscopy instruments",         "Arthroscopy",  "",                   True,  "Sterile"),
    "cystoscope":            ("Cystoscope",                      "Endoscope",    "",                   True,  "Sterile"),
    "telescope_30":          ("30-degree telescope",             "Endoscope",    "30°",                True,  "Sterile"),
    "tv_camera":             ("TV camera",                       "Camera",       "",                   True,  "In use"),
    # --- ORIF (previous round) ---
    "verbrugge_holder":      ("Verbrugge bone holder",           "Bone",         "",                   True,  "Sterile"),
    "h_groove_holder":       ("H-groove bone holder",            "Bone",         "",                   True,  "Sterile"),
    "rake_retractor":        ("Rake retractor",                  "Retractor",    "",                   True,  "Sterile"),
    "red_retractor":         ("Red retractor",                   "Retractor",    "",                   True,  "Sterile"),
    "amsley_retractor":      ("Amsley retractor",                "Retractor",    "",                   True,  "Sterile"),
    "small_drill":           ("Small orthopaedic drill",         "Drill",        "",                   True,  "Sterile"),
    "large_drill":           ("Large orthopaedic drill",         "Drill",        "",                   True,  "Sterile"),
    "tourniquet":            ("Tourniquet",                      "Equipment",    "",                   True,  "Sterile"),
    "latex_tubing":          ("Latex tubing",                    "Suction",      "",                   False, "Sterile"),
    # --- NEW (this round) ---
    "k_wire_set":            ("K-wire set",                      "Bone",         "",                   True,  "Sterile"),
    "oscalap_drill":         ("Oscalap drill",                   "Drill",        "confirm exact model", True, "Sterile"),
    "dissector_drill":       ("Dissector drill",                 "Drill",        "",                   True,  "Sterile"),
    "escalab_drill":         ("Escalab drill",                   "Drill",        "confirm exact model", True, "Sterile"),
    "surgical_drill_3mm":    ("Surgical drill (3mm)",            "Drill",        "3mm",                True,  "Sterile"),
    "diathermy_machine":     ("Diathermy machine",               "Equipment",    "",                   True,  "In use"),
    "suction_machine":       ("Suction machine",                 "Equipment",    "",                   True,  "In use"),
    "skin_staples":          ("Skin stapler",                    "Closure",      "",                   False, "Sterile"),
}

# key: (name, type, contents, reusable, sterile_days, sterilized_days_ago)
PACKS = {
    # --- original ---
    "major_tray":            ("Major instrument tray",                    "Instrument tray", "Standard major set, 60 pieces", True,  20, 10),
    "minor_tray":            ("Minor instrument tray",                    "Instrument tray", "Minor set, 28 pieces",          True,  25,  5),
    "lap_set":               ("Laparoscopy set",                          "Instrument tray", "Trocars, graspers, scope cover", True, 15, 15),
    "gown_pack":             ("Sterile gown pack (large)",                "Gown pack",       "4 gowns, 4 towels",             False, 300, None),
    "laparotomy_drape":      ("Laparotomy drape pack",                    "Drape pack",      "Fenestrated drape, Mayo cover, basins", False, 280, None),
    "ortho_hip_set":         ("Orthopaedic hip set",                      "Instrument tray", "Hip arthroplasty instruments",  True,  12, 18),
    "csection_pack":         ("Caesarean section pack",                   "Drape pack",      "C-section drape, gowns, swabs", False, 260, None),
    # --- ENT / thyroid ---
    "ent_dissect_mastoid":   ("ENT Dissecting tray (Mastoidectomy)",      "Instrument tray", "Mastoidectomy dissecting instruments", True, 20, 8),
    "tympano_tray_1_2":      ("Tympanoplasty tray I / II",                "Instrument tray", "Tympanoplasty instruments (I or II)", True, 20, 8),
    "tympano_tray_3":        ("Tympanoplasty tray III",                   "Instrument tray", "Tympanoplasty instruments III", True, 20, 8),
    "tympano_hooks":         ("Tympanoplasty hooks",                      "Instrument set",  "Tympanoplasty hooks",           True,  20,  8),
    "tympano_extras":        ("Tympanoplasty extras",                     "Extras pack",     "Tympanoplasty extras",          True,  25,  5),
    "tympano_linen":         ("Tympanoplasty linen",                      "Linen pack",      "Tympanoplasty linen",           False, 250, None),
    "thyroid_extras":        ("Thyroid extras",                           "Extras pack",     "Thyroid extras",                True,  20, 10),
    "bowl_pack":             ("Bowl pack",                                "Drape pack",      "Bowls, basins",                 False, 260, None),
    "splash_bowl":           ("Splash bowl",                              "Bowl",            "Splash bowl",                   True,  100, 20),
    "major_drape":           ("Major drape",                              "Drape",           "Major drape",                   False, 260, None),
    "crown_pack":            ("Crown pack",                               "Drape pack",      "Crown drape pack",              False, 250, None),
    "bowel_pack":            ("Bowel pack",                               "Drape pack",      "Bowel procedure drape",         False, 250, None),
    # --- Maxillofacial / dental ---
    "dental_tray":           ("Dental tray",                              "Instrument tray", "Dental extraction / disimpaction", True, 20, 8),
    # --- Orthopaedic (ORIF) ---
    "ortho_minor_tray":      ("Orthopaedic minor tray",                   "Instrument tray", "Ortho minor instruments",       True, 20, 10),
    "ortho_major_tray":      ("Orthopaedic major tray",                   "Instrument tray", "Ortho major instruments",       True, 20, 10),
    "small_fragment_set":    ("Small fragment set",                       "Instrument set",  "Small fragment screws / plates", True, 20, 10),
    "large_fragment_tray":   ("Large fragment tray",                      "Instrument tray", "Large fragment plates + screws", True, 20, 10),
    "auto_miner_tray":       ("Auto-Miner tray",                          "Instrument tray", "Auto-Miner orthopaedic set",    True, 20, 10),
    "sterile_drape_medium":  ("Sterile drape (medium)",                   "Drape",           "Medium sterile drape",          False, 260, None),
    "meniscectomy_tray":     ("Meniscectomy tray",                        "Instrument tray", "Meniscectomy instruments",      True, 20, 10),
    "arthroscopy_tray":      ("Arthroscopy tray",                         "Instrument tray", "Arthroscopy instruments",       True, 15, 10),
    "spinal_rongeur":        ("Spinal & Rongeur",                         "Instrument tray", "Spinal + rongeur set",          True, 20, 10),
    "general_set":           ("General Set",                              "Instrument tray", "Standard general set",          True, 20, 10),
    # --- NEW (this round) ---
    "hip_tray":              ("Hip tray",                                 "Instrument tray", "Hip arthroplasty set",          True, 15, 10),
    "pelvic_set":            ("Pelvic set",                               "Instrument set",  "Pelvic / acetabular instruments", True, 15, 10),
    "sterile_drape_20x45":   ("Sterile drape (20 x 45)",                  "Drape",           "20 x 45cm sterile drape",       False, 260, None),
    "pop_materials":         ("Plaster of Paris (POP)",                   "Consumable",      "POP rolls for immobilisation",  False, 900, None),
    "large_dressing_pad":    ("Large dressing pad",                       "Dressing",        "Large dressing pad",            False, 500, None),
    "medium_dressing_pad":   ("Medium dressing pad",                      "Dressing",        "Medium dressing pad",           False, 500, None),
    "small_dressing_pad":    ("Small dressing pad",                       "Dressing",        "Small dressing pad",            False, 500, None),
    "inadine":               ("Inadine",                                  "Dressing",        "Iodine-impregnated dressing",   False, 500, None),
    "telfa":                 ("Telfa",                                    "Dressing",        "Non-adherent dressing",         False, 500, None),
    "sterile_towel":         ("Sterile towels",                           "Linen pack",      "Sterile towels",                False, 260, None),
}

# ═════════════════════════════════════════════════════════════════════════════
#  Cards
# ═════════════════════════════════════════════════════════════════════════════
S, I, P = "suture", "instrument", "pack"

CARDS = [
    # ═══════════════════════════════════════════════════════════════════════
    #  Original 10 cards
    # ═══════════════════════════════════════════════════════════════════════
    ("Mr Machawira", "Tonsillectomy", "ACTIVE", dict(
        patient_position="Supine, shoulder roll", position_aids="Head ring, shoulder roll",
        anaesthesia_type="GA", skin_prep="None (oral procedure)", diathermy_settings="Bipolar 25W",
        estimated_minutes=40, version_no=3, verified=True, due=-10),
     [(I, "boyle_davis", 1, "Check tongue blade size"), (I, "tonsil_snare", 1, "Booked for repair"),
      (I, "spencer", 4, ""), (I, "bipolar", 1, ""), (I, "yankauer", 2, ""),
      (S, "silk_3_0_tie", 6, "Pre-cut 45cm"), (P, "minor_tray", 1, "")],
     [("WARNING", "Check for loose teeth before inserting gag."),
      ("PREFERENCE", "Prefers bipolar dissection over cold steel.")]),

    ("Mr Machawira", "Grommet insertion", "DRAFT", dict(
        patient_position="Supine, head turned", anaesthesia_type="GA", estimated_minutes=15, due=60),
     [(P, "minor_tray", 1, "Microscope required")],
     [("GENERAL", "Card still being compiled from paper version.")]),

    ("Dr Ncube", "Laparoscopic cholecystectomy", "ACTIVE", dict(
        patient_position="Supine, reverse Trendelenburg 20°, tilt left", position_aids="Gel pads, foot board",
        anaesthesia_type="GA", skin_prep="Chlorhexidine 2% alcoholic", diathermy_settings="Monopolar 30W cut / 30W coag",
        estimated_minutes=75, version_no=2, verified=True, due=120),
     [(P, "lap_set", 1, ""), (I, "maryland", 1, ""), (I, "hemolok", 2, "Keep spare sterile"),
      (S, "vicryl_2_0_rb", 1, "Port site fascia"), (S, "monocryl_4_0", 2, "Skin, subcuticular"),
      (P, "gown_pack", 2, "")],
     [("WARNING", "Latex allergy protocol if flagged on theatre list."),
      ("POSITIONING", "Left arm tucked, right arm on board.")]),

    ("Dr Ncube", "Inguinal hernia repair (mesh)", "UNDER_REVIEW", dict(
        patient_position="Supine", anaesthesia_type="SPINAL", skin_prep="Chlorhexidine 2% alcoholic",
        estimated_minutes=60, due=-3),
     [(P, "major_tray", 1, ""), (S, "prolene_2_0", 2, "Mesh fixation"), (S, "vicryl_2_0_rb", 2, ""),
      (S, "nylon_3_0", 1, "Skin"), (I, "weitlaner", 1, "")],
     [("PREFERENCE", "Wants 15x15cm polypropylene mesh on trolley.")]),

    ("Dr Ncube", "Open appendicectomy", "ARCHIVED", dict(
        patient_position="Supine", anaesthesia_type="GA", version_no=1, due=None),
     [(P, "minor_tray", 1, ""), (S, "vicryl_2_0_rb", 1, "")],
     [("GENERAL", "Superseded by version 2.")]),

    ("Dr Ncube", "Open appendicectomy", "ACTIVE", dict(
        patient_position="Supine, slight tilt to left", anaesthesia_type="GA", skin_prep="Povidone-iodine",
        estimated_minutes=45, version_no=2, verified=True, due=200),
     [(P, "minor_tray", 1, ""), (S, "vicryl_2_0_rb", 2, "Appendix stump tie and fascia"),
      (S, "chromic_2_0", 1, ""), (S, "monocryl_4_0", 1, "Skin")],
     []),

    ("Prof Moyo", "Total hip replacement", "ACTIVE", dict(
        patient_position="Lateral decubitus", position_aids="Hip positioners x3, axillary roll",
        anaesthesia_type="SPINAL", skin_prep="Chlorhexidine 2% alcoholic, double prep",
        estimated_minutes=120, version_no=1, verified=True, due=90),
     [(P, "ortho_hip_set", 1, ""), (P, "major_tray", 1, ""), (I, "langenbeck", 2, ""),
      (S, "pds_1", 2, "Capsule and fascia"), (S, "monocryl_4_0", 2, ""), (P, "gown_pack", 4, "Double gloving team")],
     [("WARNING", "Confirm implant sizes and cement are in theatre before patient is sent for."),
      ("POST_OP", "Abduction pillow to recovery.")]),

    ("Mr Chikwanha", "Varicose vein stripping", "ACTIVE", dict(
        patient_position="Supine, leg abducted and externally rotated", anaesthesia_type="GA",
        skin_prep="Chlorhexidine 2% aqueous, whole leg", estimated_minutes=90, version_no=1, verified=True, due=45),
     [(P, "major_tray", 1, ""), (I, "metz", 1, ""), (I, "spencer", 6, ""), (S, "silk_2_0_tie", 8, ""),
      (S, "vicryl_3_0_cut", 2, "Groin closure"), (S, "nylon_3_0", 2, "Stab avulsions")],
     [("POST_OP", "Crepe bandage then class 2 compression stocking in theatre.")]),

    ("Dr Dube", "TURP", "ACTIVE", dict(
        patient_position="Lithotomy", position_aids="Stirrups, padded", anaesthesia_type="SPINAL",
        estimated_minutes=60, version_no=2, verified=True, due=150),
     [(P, "gown_pack", 2, ""), (I, "yankauer", 1, "")],
     [("WARNING", "Glycine irrigation - monitor for TUR syndrome.")]),

    ("Dr Sithole", "Caesarean section", "ACTIVE", dict(
        patient_position="Supine, left lateral tilt", anaesthesia_type="SPINAL", skin_prep="Chlorhexidine 2% alcoholic",
        diathermy_settings="Monopolar 30W/30W", estimated_minutes=50, version_no=4, verified=True, due=30),
     [(P, "csection_pack", 1, ""), (S, "vicryl_1_rb", 3, "Uterus, two layers"), (S, "pds_1", 1, "Rectus sheath"),
      (S, "monocryl_4_0", 1, "Skin"), (I, "mayo", 1, "")],
     [("WARNING", "Neonatal team and warmer must be in theatre before incision."),
      ("PREFERENCE", "Bladder flap only if adhesions present.")]),

    # ═══════════════════════════════════════════════════════════════════════
    #  Mr Tumushime (ENT) — 5 cards
    # ═══════════════════════════════════════════════════════════════════════
    # Tympanoplasty (trays + sutures merged)
    ("Mr Tumushime", "Tympanoplasty", "ACTIVE", dict(
        patient_position="Supine, head turned", anaesthesia_type="GA", glove_size="7½",
        skin_prep="Betadine (cleaning solution)", estimated_minutes=90,
        version_no=1, verified=True, due=180),
     [(P, "ent_dissect_mastoid", 1, ""),
      (P, "tympano_tray_1_2", 1, ""),
      (P, "tympano_tray_3", 1, ""),
      (P, "tympano_hooks", 1, ""),
      (P, "tympano_extras", 1, ""),
      (P, "tympano_linen", 1, ""),
      (S, "vicryl_3_0_cut", 1, "3/0 Vicryl Δ"),
      (S, "vicryl_3_0_cut", 1, "3/0 Vicryl Δ (second)"),
      (I, "yankauer", 1, "Normal saline 200mls"),
      (I, "yankauer", 1, "Adrenaline 1:1000"),
      (I, "yankauer", 1, "Lyostypt"),
      (I, "yankauer", 1, "Kenacomb cream"),
      (I, "yankauer", 1, "Ear wick (Merocel)"),
      (I, "yankauer", 1, "Sofra tulle"),
      (I, "yankauer", 1, "Plain gauze")],
     [("GENERAL", "Cleaning solution: Betadine."),
      ("WARNING", "Blades: size 10 & 15."),
      ("GENERAL", "P O Rs; Plain lignocaine cartridge."),
      ("PREFERENCE", "Dressings: Ribbon gauze 1/4\", cotton wool, crepe bandage 6\" adult / 4\" child.")]),

    # Myringoplasty ("Myrelectomy" in source)
    ("Mr Tumushime", "Myringoplasty", "ACTIVE", dict(
        patient_position="Supine, head turned", anaesthesia_type="GA", glove_size="7½",
        skin_prep="Betadine", estimated_minutes=60,
        version_no=1, verified=True, due=180),
     [(P, "major_tray", 1, ""),
      (P, "thyroid_extras", 1, ""),
      (P, "bowl_pack", 1, ""),
      (P, "splash_bowl", 1, ""),
      (P, "major_drape", 1, ""),
      (P, "gown_pack", 3, ""),
      (I, "bipolar", 1, "Diathermy pencil"),
      (I, "mayo_towel_clip", 1, ""),
      (I, "cats_paw", 2, "")],
     [("GENERAL", "Gloves: 7½ x2.")]),

    # Functional neck dissection (merged trays + blurry sutures)
    ("Mr Tumushime", "Functional neck dissection", "ACTIVE", dict(
        patient_position="Supine, head turned, shoulder roll", position_aids="Shoulder roll",
        anaesthesia_type="GA", skin_prep="Betadine", estimated_minutes=150,
        version_no=1, verified=True, due=180),
     [(P, "major_tray", 1, ""),
      (P, "crown_pack", 1, ""),
      (P, "major_drape", 1, ""),
      (P, "splash_bowl", 1, ""),
      (P, "bowl_pack", 1, ""),
      (I, "latex_tubing", 1, "Latex tubing"),
      (I, "yankauer", 1, "Peanuts"),
      (I, "yankauer", 1, "Potovac drain 3mm"),
      (I, "tonsil_snare", 1, "Tonsil swabs"),
      (P, "thyroid_extras", 1, "")],
     [("GENERAL", "Cleans with Betadine. Post-op dressing: Ligasorb."),
      ("PREFERENCE", "Sutures from paper card (partial legible): 2/0 silk ties, vicryl.")]),

    # Thyroidectomy
    ("Mr Tumushime", "Thyroidectomy", "ACTIVE", dict(
        patient_position="Supine, neck extended, shoulder roll",
        position_aids="Shoulder roll", anaesthesia_type="GA", skin_prep="Betadine",
        estimated_minutes=120, version_no=1, verified=True, due=180),
     [(S, "vicryl_2_0_rb", 1, "2/0 Vicryl Δ x1"),
      (S, "silk_2_0_tie", 2, "2/0 Silk ties x2"),
      (S, "silk_0_tie", 2, "2/0 Silk O x2"),
      (S, "monocryl_3_0_cut", 1, "3/0 Monocryl Δ x1"),
      (S, "nylon_2_0", 1, "2/0 Nylon Δ x1 for drain"),
      (S, "prolene_2_0", 1, "POLS x1"),
      (I, "yankauer", 1, "Potovac drain 3mm x1"),
      (P, "thyroid_extras", 1, "")],
     [("PREFERENCE", "Drain: Potovac 3mm.")]),

    # ═══════════════════════════════════════════════════════════════════════
    #  Mr Gucama Tunhu (MaxFax) — DCR
    # ═══════════════════════════════════════════════════════════════════════
    ("Mr Gucama Tunhu", "Dacryocystorhinostomy", "ACTIVE", dict(
        patient_position="Supine, head slightly extended", anaesthesia_type="GA",
        skin_prep="Iodine", estimated_minutes=60,
        version_no=1, verified=True, due=180),
     [(P, "ortho_minor_tray", 1, ""),
      (P, "spinal_rongeur", 1, ""),
      (I, "punch_3mm", 1, ""),
      (I, "cats_paw", 2, ""),
      (I, "periosteal_small", 1, ""),
      (I, "periosteal_large", 1, ""),
      (I, "mcdonald", 1, ""),
      (I, "crile", 2, ""),
      (I, "baby_travers", 1, ""),
      (I, "penny_baker", 1, ""),
      (I, "gillies", 1, ""),
      (I, "adson_frazer", 1, ""),
      (I, "metz", 1, "")],
     [("GENERAL", "Surgeon on source card: 'MR GUCAMA TUNHU / CHIKAMA?' - confirmed as Mr Gucama Tunhu.")]),

    # ═══════════════════════════════════════════════════════════════════════
    #  Dr Chidziva — Laryngectomy (trays + sutures merged)
    # ═══════════════════════════════════════════════════════════════════════
    ("Dr Chidziva", "Laryngectomy", "ACTIVE", dict(
        patient_position="Supine, neck extended, shoulder roll",
        position_aids="Head ring, sand bag, shoulder roll",
        anaesthesia_type="GA", glove_size="8",
        skin_prep="Betadine", estimated_minutes=240,
        diathermy_settings="Diathermy pencil",
        version_no=1, verified=True, due=180),
     [(P, "minor_tray", 1, ""),
      (P, "major_tray", 1, ""),
      (P, "thyroid_extras", 1, ""),
      (P, "major_drape", 1, ""),
      (P, "crown_pack", 3, ""),
      (P, "bowl_pack", 1, ""),
      (I, "langenbeck", 2, "Large Langenbecks"),
      (I, "bipolar", 1, "Diathermy pencil"),
      (I, "yankauer", 1, "Suction"),
      (I, "magils_forceps", 1, "Magill forceps for anaesthetic"),
      (S, "silk_0_tie", 1, "O Silk Δ ties"),
      (S, "silk_2_0_needled_cut", 1, "2/0 Silk P Δ skin"),
      (S, "vicryl_3_0_cut", 1, "3/0 Vicryl Δ muscles"),
      (S, "vicryl_3_0_rb", 1, "3/0 Vicryl O small needle — tendons"),
      (S, "silk_0_needled_cut", 1, "O Silk Δ Colts — peritoneum"),
      (S, "silk_0_tie", 1, "O Silk O — bowel"),
      (S, "nylon_3_0_small", 1, "3/0 Nylon Δ small needle")],
     [("WARNING", "Bonns blue for marking. Tracheostomy tube + laryngectomy tube ready."),
      ("GENERAL", "Cleans with Betadine. Dressings: Telfa, Sofra Tulle. Skin clips on fascia."),
      ("POSITIONING", "Anaesthetic prep: diathermy, anaesthetic extension, head ring, polar tube, sterile catheter mount, V-J jelly, 20ml syringe, sand bag.")]),

    # ═══════════════════════════════════════════════════════════════════════
    #  Dr Maiana — Disimpaction of tooth (Dental / MaxFax)
    # ═══════════════════════════════════════════════════════════════════════
    ("Dr Maiana", "Disimpaction of tooth", "ACTIVE", dict(
        patient_position="Supine, mouth open, throat pack in situ",
        anaesthesia_type="GA", skin_prep="None (intraoral)",
        estimated_minutes=45, version_no=1, verified=True, due=180),
     [(P, "dental_tray", 1, ""),
      (P, "ortho_minor_tray", 1, ""),
      (P, "splash_bowl", 1, ""),
      (P, "bowl_pack", 1, ""),
      (P, "gown_pack", 3, ""),
      (P, "major_drape", 1, ""),
      (I, "periosteal_large", 1, "Meniscectomy Langenbeck single OR meniscectomy tray"),
      (I, "mayo_towel_clip", 2, ""),
      (I, "dental_cartridge", 4, ""),
      (I, "dental_needle_27", 2, ""),
      (I, "maxfac_drill", 1, "Surgantown maxillofacial drill"),
      (I, "yankauer", 1, "Saline to cool drill"),
      (I, "throat_pack", 1, ""),
      (I, "magils_forceps", 1, ""),
      (S, "vicryl_3_0_rb", 1, "3/0 Vicryl round body")],
     [("WARNING", "Alcohol 70% to sterilize drill."),
      ("GENERAL", "Blade size 15."),
      ("PREFERENCE", "Uses Meniscectomy Langenbeck (single items) OR full meniscectomy tray."),
      ("WARNING", "Dental extras: Crown tray items required.")]),

    # ═══════════════════════════════════════════════════════════════════════
    #  Prof Mudemwa — Bilateral breast reduction
    # ═══════════════════════════════════════════════════════════════════════
    ("Prof Mudemwa", "Bilateral breast reduction", "ACTIVE", dict(
        patient_position="Supine, arms abducted", anaesthesia_type="GA",
        skin_prep="Povidine Betadine",
        estimated_minutes=180, version_no=1, verified=True, due=180),
     [(P, "general_set", 1, ""),
      (I, "toothed_addison", 2, ""),
      (I, "nontoothed_addison", 2, ""),
      (I, "needle_holder_70mm", 2, "70mm fine needle holder"),
      (I, "littlewood", 2, "Littlewood tissue forceps"),
      (I, "lawrie_forceps", 2, ""),
      (I, "yankauer", 1, "3mm drain on standby"),
      (I, "bipolar", 1, "Sterile marker"),
      (S, "vicryl_3_0_rb", 2, "Dermal closure"),
      (S, "monocryl_4_0", 2, "Subcuticular skin")],
     [("PREFERENCE", "1 inch crepe bandage x2. Sterile marker."),
      ("WARNING", "3mm drain on standby. Cleanse with Povidine Betadine.")]),

    # ═══════════════════════════════════════════════════════════════════════
    #  Prof Muchamwa — Breast reduction (local anaesthesia)
    # ═══════════════════════════════════════════════════════════════════════
    ("Prof Muchamwa", "Breast reduction (local anaesthesia)", "ACTIVE", dict(
        patient_position="Supine, arms abducted, chest & breast prep",
        anaesthesia_type="LOCAL", skin_prep="Chlorhexidine 2% alcoholic",
        estimated_minutes=120, version_no=1, verified=True, due=180),
     [(I, "yankauer", 2, "Kidney dishes (bowls) 800mls"),
      (I, "yankauer", 1, "Alcohol swabs"),
      (I, "yankauer", 4, "Gauze swabs"),
      (I, "yankauer", 3, "20ml syringes"),
      (I, "yankauer", 3, "21G needles"),
      (I, "yankauer", 1, "Normal saline - 1 Litre"),
      (I, "yankauer", 2, "Lignocaine vials"),
      (I, "yankauer", 2, "Plain Marcaine vials"),
      (I, "yankauer", 1, "Adrenaline")],
     [("WARNING", "Make sure the tray is ready 15 minutes before procedure."),
      ("PREFERENCE", "Card No: PLAST-003.")]),

    # ═══════════════════════════════════════════════════════════════════════
    #  Mr Gova — Arthroscopic procedure
    # ═══════════════════════════════════════════════════════════════════════
    ("Mr Gova", "Arthroscopic procedure", "ACTIVE", dict(
        patient_position="Supine, leg positioned for arthroscopy",
        anaesthesia_type="SPINAL", skin_prep="Iodine",
        estimated_minutes=90, version_no=1, verified=True, due=180),
     [(P, "arthroscopy_tray", 1, ""),
      (I, "telescope_30", 1, ""),
      (I, "tv_camera", 1, ""),
      (I, "cystoscope", 1, "verify requirement"),
      (I, "yankauer", 1, "one-way valve"),
      (I, "yankauer", 1, "extra rinsing trough"),
      (I, "yankauer", 1, "Large trough"),
      (I, "yankauer", 1, "Side X trough"),
      (I, "yankauer", 1, "Myrtle clip"),
      (I, "yankauer", 1, "Drip stand"),
      (I, "yankauer", 1, "Pressure bag"),
      (I, "mayo_towel_clip", 4, ""),
      (I, "yankauer", 1, "Gown pick / bowel pick"),
      (I, "yankauer", 1, "Four-inch clip"),
      (I, "yankauer", 1, "Normal saline"),
      (I, "yankauer", 1, "Blood-text tubing"),
      (P, "major_drape", 1, ""),
      (I, "yankauer", 1, "Abdominal swabs"),
      (I, "yankauer", 1, "Rectal swab"),
      (I, "yankauer", 1, "Gauze swabs")],
     [("WARNING", "Confirm arthroscopy tray, arthroscopy instruments from cage, cystoscope, and 30-degree telescope before procedure."),
      ("GENERAL", "Prepare TV camera, one-way valve, rinsing troughs, clips, tubing, normal saline, pressure bag, drip stand."),
      ("WARNING", "Verify exact arthroscopic procedure name and all items flagged as unclear before setup.")]),

    # ═══════════════════════════════════════════════════════════════════════
    #  Mr Gova — ORIF ankle
    # ═══════════════════════════════════════════════════════════════════════
    ("Mr Gova", "ORIF ankle", "ACTIVE", dict(
        patient_position="Supine, leg exsanguinated before tourniquet inflation",
        position_aids="Tourniquet on thigh",
        anaesthesia_type="SPINAL", glove_size="8",
        skin_prep="Iodine", estimated_minutes=90,
        version_no=1, verified=True, due=180),
     [(P, "ortho_minor_tray", 1, ""),
      (P, "ortho_major_tray", 1, ""),
      (P, "small_fragment_set", 1, ""),
      (I, "small_drill", 1, "Confirm functionality before incision"),
      (I, "tourniquet", 1, "Test before exsanguination"),
      (S, "vicryl_1_rb", 2, "0-Vicryl cutting; deep closure"),
      (P, "major_drape", 1, ""),
      (P, "gown_pack", 3, ""),
      (P, "bowel_pack", 1, "")],
     [("WARNING", "Prepare dressings: Inadine plain gauze + crepe bandage."),
      ("WARNING", "Confirm tourniquet and small drill are functional before the case starts."),
      ("POSITIONING", "Ortho minor tray, major drape, three gown packs, bowel pack, and small fragment set must be in theatre before the patient is sent for.")]),

    # ═══════════════════════════════════════════════════════════════════════
    #  Mr Nystigover — ORIF humerus
    # ═══════════════════════════════════════════════════════════════════════
    ("Mr Nystigover", "ORIF humerus", "ACTIVE", dict(
        patient_position="Beach-chair / semi-sitting",
        position_aids="Arm board, sandbag under shoulder",
        anaesthesia_type="GA", glove_size="8",
        skin_prep="Iodine", estimated_minutes=120,
        version_no=1, verified=True, due=180),
     [(P, "ortho_minor_tray", 1, ""),
      (P, "ortho_major_tray", 1, ""),
      (P, "large_fragment_tray", 1, ""),
      (I, "large_drill", 1, "Confirm drill attachments with surgeon"),
      (P, "gown_pack", 3, ""),
      (P, "splash_bowl", 1, ""),
      (I, "verbrugge_holder", 2, ""),
      (I, "h_groove_holder", 2, ""),
      (I, "rake_retractor", 2, ""),
      (I, "red_retractor", 2, ""),
      (I, "mayo_towel_clip", 4, ""),
      (I, "yankauer", 1, ""),
      (I, "latex_tubing", 1, "")],
     [("PREFERENCE", "Dressings: Velpeau bandage + crepe bandage."),
      ("WARNING", "Confirm exact names/specs of guide pegs, bone peg, and retractors with surgeon."),
      ("WARNING", "Confirm plates, screws, and drill attachments with surgeon before setup."),
      ("POSITIONING", "Verify bandaging and dressing requirements before the procedure.")]),

    # ═══════════════════════════════════════════════════════════════════════
    #  Mr Kova — ORIF radius
    # ═══════════════════════════════════════════════════════════════════════
    ("Mr Kova", "ORIF radius", "ACTIVE", dict(
        patient_position="Supine, arm on hand table, exsanguinated",
        position_aids="Hand table, tourniquet on upper arm",
        anaesthesia_type="GA", glove_size="8 (Maxitex)",
        skin_prep="Iodine", estimated_minutes=90,
        version_no=1, verified=True, due=180),
     [(P, "auto_miner_tray", 1, ""),
      (I, "small_drill", 1, "Confirm drill equipment for radius fixation"),
      (P, "small_fragment_set", 1, "Plates and screws per surgeon"),
      (I, "h_groove_holder", 2, ""),
      (I, "rake_retractor", 2, ""),
      (I, "amsley_retractor", 2, ""),
      (I, "tourniquet", 1, "Follow hospital tourniquet protocol"),
      (P, "sterile_drape_medium", 1, ""),
      (P, "major_drape", 1, ""),
      (I, "yankauer", 1, ""),
      (I, "latex_tubing", 1, "")],
     [("WARNING", "Blister pack of plates and screws per surgeon's preference."),
      ("PREFERENCE", "Cleanse with iodine. Dressing: plain gauze, 4\" crepe bandage, orthopaedic wool bandage."),
      ("WARNING", "Confirm exact instrument names and required equipment with surgeon."),
      ("WARNING", "Confirm required plates, screws, and drill equipment for radius fixation before setup."),
      ("WARNING", "Verify tourniquet requirements and settings per hospital protocol.")]),

    # ═══════════════════════════════════════════════════════════════════════
    #  Mr Gova — Achilles tendon repair (NEW)
    # ═══════════════════════════════════════════════════════════════════════
    ("Mr Gova", "Achilles tendon repair", "ACTIVE", dict(
        patient_position="Prone, feet over end of table, three pillows under ankles",
        position_aids="Three pillows",
        anaesthesia_type="GA",
        glove_size="8",
        skin_prep="Iodine",
        estimated_minutes=60,
        version_no=1, verified=True, due=180),
     [(P, "ortho_minor_tray", 1, ""),
      (I, "k_wire_set", 1, "Confirm K-wire specs with surgeon"),
      (I, "weitlaner", 2, "Retractors (confirm type)"),
      (P, "pop_materials", 1, "Prepare POP before incision"),
      (S, "pds_1_cutting", 1, "1 PDS on cutting needle — tendon repair"),
      (S, "nylon_2_0", 1, "2-0 Nylon on cutting needle"),
      (S, "nylon_3_0", 1, "3-0 Nylon on cutting needle")],
     [("POSITIONING", "Three pillows for positioning. Confirm final patient position with surgeon and anaesthesia team."),
      ("WARNING", "Prepare POP materials before the procedure."),
      ("WARNING", "Confirm K-wire specifications and immobilisation technique with surgeon."),
      ("WARNING", "Verify suture sizes and needle types before the procedure.")]),

    # ═══════════════════════════════════════════════════════════════════════
    #  Mr Grova — Repair of acetabulum (NEW)
    # ═══════════════════════════════════════════════════════════════════════
    ("Mr Grova", "Repair of acetabulum", "ACTIVE", dict(
        patient_position="Lateral or supine per surgeon (confirm at briefing)",
        anaesthesia_type="GA",
        glove_size="8",
        skin_prep="Iodine solution",
        estimated_minutes=180,
        version_no=1, verified=True, due=180),
     [(P, "hip_tray", 1, ""),
      (P, "ortho_major_tray", 1, "Orthomeja — confirm exact set name"),
      (P, "pelvic_set", 1, ""),
      (P, "small_fragment_set", 1, ""),
      (P, "large_fragment_tray", 1, ""),
      (I, "escalab_drill", 1, "Confirm exact equipment name"),
      (I, "surgical_drill_3mm", 1, ""),
      (I, "diathermy_machine", 1, ""),
      (I, "suction_machine", 1, ""),
      (P, "major_drape", 1, ""),
      (P, "gown_pack", 3, ""),
      (P, "sterile_drape_20x45", 2, "Confirm dimensions"),
      (I, "yankauer", 4, "Swabs"),
      (I, "yankauer", 2, "Red-tag swabs"),
      (S, "vicryl_1_rb", 1, "No. 1 Vicryl cutting"),
      (S, "vicryl_2_0_rb", 1, "No. 2-0 Vicryl cutting"),
      (S, "vicryl_3_0_cut", 1, "No. 3-0 Vicryl cutting"),
      (I, "skin_staples", 2, "Skin closure"),
      (I, "yankauer", 1, "Plain gauze"),
      (P, "large_dressing_pad", 2, ""),
      (P, "medium_dressing_pad", 2, ""),
      (P, "small_dressing_pad", 2, ""),
      (P, "sterile_towel", 4, "Towels")],
     [("WARNING", "Confirm the exact drill system, drape dimensions, and suture needle specifications with Mr. Grova before finalising."),
      ("WARNING", "Implant requirements — plates and screws — should be confirmed for the specific acetabular repair."),
      ("GENERAL", "Cleaning solution: iodine. Dressing: plain gauze, large/medium/small dressing pads, towels.")]),

    # ═══════════════════════════════════════════════════════════════════════
    #  Mr Mlalazi — ORIF (general) (NEW)
    # ═══════════════════════════════════════════════════════════════════════
    ("Mr Mlalazi", "ORIF", "ACTIVE", dict(
        patient_position="Per fracture site — confirm at briefing",
        anaesthesia_type="GA",
        glove_size="7½",
        skin_prep="Inadine",
        estimated_minutes=120,
        version_no=1, verified=True, due=180),
     [(P, "ortho_major_tray", 1, ""),
      (P, "ortho_minor_tray", 1, ""),
      (P, "bowel_pack", 1, ""),
      (P, "major_drape", 1, "Large drapes"),
      (I, "oscalap_drill", 1, "Confirm model with surgeon"),
      (I, "dissector_drill", 1, ""),
      (S, "vicryl_1_rb", 1, "One Vicryl cutting"),
      (S, "pds_1_cutting", 1, "One PDS cutting"),
      (S, "vicryl_2_0_rb", 1, "2-0 Vicryl cutting"),
      (S, "nylon_0", 1, "Nylon 0"),
      (S, "monocryl_3_0_cut", 1, "Monocryl 3-0"),
      (I, "skin_staples", 2, ""),
      (P, "inadine", 1, ""),
      (P, "telfa", 1, ""),
      (I, "yankauer", 1, "Plain gauze")],
     [("WARNING", "Confirm the availability and suitability of all instruments, equipment, sutures, dressings, gloves, and implants before the procedure."),
      ("PREFERENCE", "Gloves: MaxiTex size 7.5."),
      ("GENERAL", "Dressings: Inadine, Telfa, plain gauze.")]),
]


# ═════════════════════════════════════════════════════════════════════════════
#  Management command
# ═════════════════════════════════════════════════════════════════════════════
class Command(BaseCommand):
    help = "Load fictional sample data (users, directory, item lists and preference cards)."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Delete ALL existing data first.")

    @transaction.atomic
    def handle(self, *args, **opts):
        if opts["reset"]:
            self._reset()
        today = date.today()
        users = self._users()
        specialties = self._specialties()
        surgeons = self._directory(specialties)
        procedures = self._procedures(specialties)
        items = self._item_lists(today)
        n_cards = self._cards(surgeons, procedures, items, users, today)
        self.stdout.write(self.style.SUCCESS(
            f"Sample data ready: {len(users)} users, "
            f"{len(specialties)} specialties, {len(surgeons)} surgeons, "
            f"{len(procedures['all'])} procedures, {n_cards} cards."
        ))
        self.stdout.write(f"Log in with any seeded username and password: {PASSWORD}")

    # ------------------------------------------------------------------
    def _reset(self):
        for model in (CardAttachment, CardNote, PreferenceCardItem, PreferenceCard, Procedure,
                      Surgeon, Doctor, Specialty, Suture, SurgicalInstrument, SurgicalPack):
            model.objects.all().delete()
        User.objects.all().delete()
        self.stdout.write("Existing data removed.")

    def _users(self):
        out = {}
        for username, first, last, job, role, phone in USERS:
            user, created = User.objects.get_or_create(username=username, defaults=dict(
                first_name=first, last_name=last, email=f"{username}@example.org",
                job_title=job, role=role, phone=phone, must_change_password=False))
            if created:
                user.set_password(PASSWORD)
                user.save()
            out[username] = user
        root, created = User.objects.get_or_create(username="superadmin", defaults=dict(
            email="superadmin@example.org", role="ADMIN", is_staff=True, is_superuser=True,
            must_change_password=False, first_name="Platform", last_name="Admin"))
        if created:
            root.set_password(PASSWORD)
            root.save()
        out["superadmin"] = root
        return out

    def _specialties(self):
        out = {}
        for order, (name, code) in enumerate(SPECIALTIES, start=1):
            out[name], _ = Specialty.objects.update_or_create(
                name=name, defaults=dict(short_code=code, sort_order=order, is_active=True, deleted_at=None))
        return out

    def _directory(self, specialties):
        """Create/update a Doctor for every row, plus a Surgeon for every row with is_surgeon=True."""
        surgeons = {}
        for title, name, spec, sub, practice, city, phone, group, is_surgeon, display, glove in DOCTORS:
            doctor = Doctor.objects.filter(doctor_name=name).first() or Doctor(doctor_name=name)
            doctor.title, doctor.specialty, doctor.sub_specialty = title, specialties[spec], sub
            doctor.practice_or_hospital, doctor.city, doctor.phone_primary = practice, city, phone
            doctor.is_group_practice, doctor.deleted_at = group, None
            doctor.save()

            if not is_surgeon:
                continue

            surgeon_display = display or name
            surgeon = Surgeon.objects.filter(doctor=doctor).first() or Surgeon(doctor=doctor)
            surgeon.display_name = surgeon_display
            surgeon.glove_size = glove or "7"
            surgeon.deleted_at = None
            surgeon.general_notes = f"{surgeon_display}: general habits apply to every card."
            surgeon.save()
            surgeons[surgeon_display] = surgeon
        return surgeons

    def _procedures(self, specialties):
        out = {}
        for spec, procs in PROCEDURES.items():
            for name, aliases in procs:
                out[name], _ = Procedure.objects.update_or_create(
                    specialty=specialties[spec], name=name, defaults=dict(aliases=aliases, deleted_at=None))
        return {"all": out}

    def _item_lists(self, today):
        out = {S: {}, I: {}, P: {}}
        for key, (mat, size, typ, needle, mm, absorb, exp) in SUTURES.items():
            out[S][key], _ = Suture.objects.update_or_create(
                material=mat, size=size, item_type=typ, needle_type=needle, needle_length_mm=mm,
                defaults=dict(is_absorbable=absorb, expiry_date=today + timedelta(days=exp), deleted_at=None))
        for key, (name, cat, var, reuse, cond) in INSTRUMENTS.items():
            out[I][key], _ = SurgicalInstrument.objects.update_or_create(
                name=name, type_or_variant=var,
                defaults=dict(category=cat, is_reusable=reuse, condition_status=cond,
                              last_sterilized_date=today - timedelta(days=7) if reuse else None, deleted_at=None))
        for key, (name, typ, contents, reuse, sterile_days, ago) in PACKS.items():
            out[P][key], _ = SurgicalPack.objects.update_or_create(
                pack_name=name, defaults=dict(
                    pack_type=typ, contents_description=contents, is_reusable=reuse,
                    sterile_until=today + timedelta(days=sterile_days),
                    last_sterilized_date=today - timedelta(days=ago) if ago else None, deleted_at=None))
        return out

    def _cards(self, surgeons, procedures, items, users, today):
        procs = procedures["all"]
        compiler, verifier = users["editor_tendai"], users["admin_chipo"]
        count = 0
        for display, proc_name, status, extra, card_items, notes in CARDS:
            surgeon = surgeons.get(display)
            procedure = procs.get(proc_name)
            if surgeon is None:
                self.stdout.write(self.style.WARNING(f"Skipping card: surgeon '{display}' not found."))
                continue
            if procedure is None:
                self.stdout.write(self.style.WARNING(f"Skipping card: procedure '{proc_name}' not found."))
                continue

            existing = PreferenceCard.objects.filter(
                surgeon=surgeon, procedure=procedure, status=status, deleted_at__isnull=True).first()
            if existing:
                continue

            extra = dict(extra)
            verified = extra.pop("verified", False)
            due = extra.pop("due", None)
            card = PreferenceCard(
                surgeon=surgeon, procedure=procedure, status=status,
                card_date=today - timedelta(days=30),
                review_due_on=today + timedelta(days=due) if due is not None else None,
                compiled_by=compiler, created_by=compiler, updated_by=compiler, **extra)
            if verified:
                card.verified_by = verifier
                card.verified_at = timezone.now() - timedelta(days=20)
            card.save()

            PreferenceCardItem.objects.bulk_create([
                PreferenceCardItem(
                    card=card, item_source=kind,
                    item_id=items[kind][key].pk,
                    quantity=qty, item_notes=note)
                for kind, key, qty, note in card_items
                if key in items[kind]
            ])
            CardNote.objects.bulk_create([
                CardNote(card=card, note_type=t, body=b, sort_order=i, created_by=compiler)
                for i, (t, b) in enumerate(notes, start=1)
            ])
            count += 1

        # Two placeholder attachments on the first ACTIVE cards
        for title, caption, kind in (
            ("Tonsillectomy", "Tray layout photo", "TRAY_LAYOUT"),
            ("Total hip replacement", "Positioning diagram", "POSITIONING"),
        ):
            card = PreferenceCard.objects.filter(procedure__name=title, status="ACTIVE").first()
            if card and not card.attachments.exists():
                att = CardAttachment(
                    card=card, caption=caption, attachment_type=kind,
                    mime_type="image/png", uploaded_by=compiler)
                att.file.save(f"{kind.lower()}_{card.pk}.png", ContentFile(TINY_PNG), save=False)
                att.save()
        return count