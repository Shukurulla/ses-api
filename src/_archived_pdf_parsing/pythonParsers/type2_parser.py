#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Type2 PDF Parser - Sil Kasalligi
Uses pdfplumber for accurate PDF text extraction with table parsing
"""

import sys
import json
import pdfplumber
import re
from typing import Dict, List, Any


def clean(text: str = "") -> str:
    """Clean and normalize text"""
    return re.sub(r'\s+', ' ', str(text)).strip()


def extract(text: str, pattern: str) -> str:
    """Extract text using regex pattern"""
    match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
    return clean(match.group(1)) if match else ""


def between(text: str, start: str, end: str) -> str:
    """Extract text between two markers"""
    start_idx = text.find(start)
    if start_idx == -1:
        return ""

    from_idx = start_idx + len(start)
    end_idx = text.find(end, from_idx) if end else -1

    if end_idx == -1:
        end_idx = len(text)

    return clean(text[from_idx:end_idx])


def parse_contacts_table(pdf) -> List[Dict[str, str]]:
    """Parse contacts table from PDF"""
    contacts = []

    try:
        for page in pdf.pages:
            # Try to extract tables
            tables = page.extract_tables()

            for table in tables:
                if not table:
                    continue

                # Look for contact table headers
                for row_idx, row in enumerate(table):
                    if row and any('F.I.SH' in str(cell) or 'F.I.Sh' in str(cell) for cell in row if cell):
                        # This is the header row, parse following rows
                        for data_row in table[row_idx + 1:]:
                            if data_row and len(data_row) >= 6:
                                # Clean and extract data
                                contact = {
                                    "t_r": clean(data_row[0]) if data_row[0] else "",
                                    "fio": clean(data_row[1]) if data_row[1] else "",
                                    "tugilgan_sana": clean(data_row[2]) if data_row[2] else "",
                                    "qarindoshlik_darajasi": clean(data_row[3]) if data_row[3] else "",
                                    "ish_oqish_joyi": clean(data_row[4]) if data_row[4] else "",
                                    "xabarnoma_yoki_tashxis_sanasi": clean(data_row[5]) if len(data_row) > 5 and data_row[5] else "",
                                    "muloqatdagilar_holati": clean(data_row[6]) if len(data_row) > 6 and data_row[6] else "",
                                }

                                # Only add if has meaningful data
                                if contact["fio"] or contact["t_r"]:
                                    contacts.append(contact)

    except Exception as e:
        print(f"Error parsing contacts table: {e}", file=sys.stderr)

    return contacts


# Field definitions for Type2
FIELD_DEFS = [
    {"label": "№", "pattern": r'№\s+(\d+)'},
    {"label": "Familiyasi, ismi, otasining ismi", "pattern": r'Familiyasi, ismi, otasining ismi\s*([^\n]+)'},
    {"label": "Manzil (asosiy ro'yxatda turgan)", "pattern": r'Manzil \(asosiy ro\'yxatda turgan\):\s*([^\n]+)'},
    {"label": "Yashab turgan manzil", "pattern": r'Yashab turgan manzil:\s*([^\n]+)'},
    {"label": "Tug'ilgan yili", "pattern": r'Tug\'ilgan yili\s*([0-9\-]+)'},
    {"label": "Kasbi", "pattern": r'Kasbi\s*([^\n]+)'},
    {"label": "Ish joyi", "pattern": r'Ish joyi\s*([^\n]+)'},
    {"label": "Kasallangan sanasi", "pattern": r'Kasallangan sanasi\s*([0-9\-:\s]+)'},
    {"label": "Silga qarshi dispanser ro'yxatidan birlamchi o'tkazilgan sana va dispanser nomi", "pattern": r'Silga qarshi dispanser.*?o\'tkazilgan sana.*?\s*([^\n]+)'},
    {"label": "Sanitariya-epidemiologiya xizmatida ro'yxatdan o'tish vaqtidagi tashxis", "pattern": r'xizmatida ro\'yxatdan o\'tish vaqtidagi tashxis\s*([^\n]+)'},
    {"label": "Kasalxonaga yotqizilgan sana", "pattern": r'Kasalxonaga yotqizilgan sana\s*([0-9\-]+)'},
    {"label": "Bemor yotqizilgan shifoxona nomi", "pattern": r'Bemor yotqizilgan shifoxona nomi\s*([^\n]+)'},
    {"label": "Yakuniy dezinfeksiya sanasi", "pattern": r'Yakuniy dezinfeksiya sanasi\s*([0-9\-]+)'},
    {"label": "Kasalxonadan chiqarilgan sana", "pattern": r'Kasalxonadan chiqarilgan sana\s*([0-9\-:\s]+)'},
    {"label": "Silga qarshi emlash", "pattern": r'Silga qarshi emlash:\s*([^\n]+)'},
    {"label": "Ish joyi sharoitlari", "pattern": r'Ish joyi sharoitlari:\s*([^\n]+)'},
    {"label": "Oila budjeti", "pattern": r'Oila budjeti:\s*([^\n]+)'},
    {"label": "Zararli odatlari", "pattern": r'Zararli odatlari:\s*([^\n]+)'},
    {"label": "Uy-joy turi (Alohida xovli joy, ko'p qavatli uyda xonadon, kommunal kvartira, yotoqxona)", "pattern": r'Uy-joy turi.*?:\s*([^\n]+)'},
    {"label": "Xonalar soni", "pattern": r'Xonalar soni\s+(\d+)'},
    {"label": "Qavatlar soni", "pattern": r'Qavatlar soni\s+(\d+)'},
    {"label": "Lift", "pattern": r'Lift\s+([^\n]+)'},
    {"label": "Bemor bilan aloqada bo'lganlar jami kishilar soni", "pattern": r'Bemor bilan aloqada bo\'lganlar jami kishilar soni\s+(\d+)'},
    {"label": "Kattalar soni", "pattern": r'Kattalar soni\s*(\d+)'},
    {"label": "O'smirlar soni", "pattern": r'o\'smirlar soni\s+(\d+)'},
    {"label": "14 yoshgacha bo'lgan bolalar soni", "pattern": r'14 yoshgacha.*?bolalar soni\s+(\d+)'},
    {"label": "Har bir xona maydoni (kv.m)", "pattern": r'har bir xona maydoni.*?\s+(\d+)'},
    {"label": "Umumiy maydon (kv.m)", "pattern": r'umumiy maydon.*?\s+(\d+)'},
    {"label": "Kvartirani, bemor xonasini sanitariya-gigiyenik holatini baholash", "pattern": r'sanitariya-gigiyenik holatini baholash:\s*([^\n]+)'},
    {"label": "Isitish", "pattern": r'Isitish:\s*([^\n]+)'},
    {"label": "Kanalizatsiya", "pattern": r'Kanalizatsiya:\s*([^\n]+)'},
    {"label": "Ventilyatsiya", "pattern": r'Ventilyatsiya\s*([^\n]+)'},
    {"label": "Yashash uchun yaroqliligi", "pattern": r'Yashash uchun yaroqliligi:\s*([^\n]+)'},
    {"label": "Cho'ntak tupukdonidan foydalanadi (ishda)", "pattern": r'Ishda\s*-\s*([^\n]+)'},
    {"label": "Cho'ntak tupukdonidan foydalanadi (uyda)", "pattern": r'Uyda\s*-\s*([^\n]+)'},
    {"label": "Cho'ntak tupukdonidan foydalanadi (jamoat joylarida)", "pattern": r'Jamoat joylarida\s*-\s*([^\n]+)'},
    {"label": "Balg'am va tupuriklarni zararsizlantirish usuli", "pattern": r'zararsizlantirish usuli:\s*([^\n]+)'},
    {"label": "Bemor dezinfeksiya vositalarini olishi", "pattern": r'Bemor dezinfeksiya vositalarini olishi:\s*([^\n]+)'},
    {"label": "Epidemiolog vrach", "pattern": r'Epidemiolog vrach\s+([A-ZА-Я][^\n]+)'},
]


def parse_pdf(pdf_path: str) -> Dict[str, Any]:
    """Parse Type2 PDF and extract all fields including contacts table"""

    try:
        with pdfplumber.open(pdf_path) as pdf:
            # Extract text from all pages
            full_text = ""
            for page in pdf.pages:
                full_text += page.extract_text() or ""

            # Extract all fields
            parsed_fields = []

            for field_def in FIELD_DEFS:
                if 'pattern' in field_def:
                    value = extract(full_text, field_def['pattern'])
                elif 'start' in field_def and 'end' in field_def:
                    value = between(full_text, field_def['start'], field_def['end'])
                else:
                    value = ""

                parsed_fields.append({
                    "label": field_def['label'],
                    "value": value
                })

            # Parse contacts table
            contacts = parse_contacts_table(pdf)
            parsed_fields.append({
                "label": "Kontaktlar",
                "value": contacts
            })

            return {
                "success": True,
                "parsed": parsed_fields,
                "raw": full_text,
                "metadata": {
                    "numPages": len(pdf.pages),
                    "info": pdf.metadata
                }
            }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "parsed": [],
            "raw": "",
            "metadata": {}
        }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "PDF file path required"}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    result = parse_pdf(pdf_path)
    print(json.dumps(result, ensure_ascii=False, indent=2))
