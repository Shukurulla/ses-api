#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Type1 PDF Parser - Yuqumli va Parazitar Kasalliklar O'chog'in
Uses pdfplumber for accurate PDF text extraction
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


def extract_timeline_dates(text: str) -> Dict[str, str]:
    """Extract timeline dates from section 17-21"""
    block = between(text, "17. Kasallangan", "22. Yotqizilgan kasalxona")

    # Find all dates in format DD-MM-YYYY with optional time
    dates = re.findall(r'\d{2}-\d{2}-\d{4}(?:\s+\d{2}:\d{2})?', block)

    return {
        'kasallangan_sana': dates[0] if len(dates) > 0 else "",
        'murojaat_vaqti': dates[1] if len(dates) > 1 else "",
        'shoshilinch_xabarnoma': dates[2] if len(dates) > 2 else "",
        'yotqizilgan_sana': dates[3] if len(dates) > 3 else "",
        'yakunlovchi_sana': dates[4] if len(dates) > 4 else "",
    }


# Field definitions
FIELD_DEFS = [
    {"label": "№", "pattern": r'№\s+(\d+)'},

    {"label": "Birlamchi tashxis", "pattern": r'1\.\s*Birlamchi tashxis\s+([^\n]+)'},

    {"label": "Kasallik qo'zg'atuvchisi", "start": "2. Kasallik qo'zg'atuvchisining turi, xili", "end": "3. Bemor"},

    {"label": "Bemor (mahalliy / kelgan)", "pattern": r'3\.\s*Bemor:\s+([A-Za-zА-Яа-я\s]+)'},

    {"label": "F.I.SH", "pattern": r'4\.\s*F\.I\.SH\s+(.+?)\n\s*5\.'},

    {"label": "Jinsi", "pattern": r'5\.\s*Jinsi\s+([A-Za-zА-Яа-я]+)'},

    {"label": "Tug'ilgan sanasi", "pattern": r'6\.\s*Tug\'ilgan sanasi\s+([0-9\-]+\s+yil)'},

    {"label": "Doimiy yashash joyi", "pattern": r'7\.\s*Doimiy yashash joyi:\s*([^\n]+(?:\n[^\n]+)?)'},

    {"label": "Hozirgi yashash joyi", "pattern": r'8\.\s*Hozirgi yashash joyi:\s*([^\n]+(?:\n[^\n]+)?)'},

    {"label": "Ishlash / O'qish joyi", "pattern": r'9\.\s*Ishlash, o\'qish joyi, bog\'cha\s*([^\n]*)'},

    {"label": "Turar joyi bo'yicha davolash muassasasi", "pattern": r'11\.\s*Turar joyi bo\'yicha davolash muassasasi:\s*([^\n]+)'},

    {"label": "Bemor haqida habar olingan sana", "pattern": r'12\.\s*Bemor haqida habar olinganligi.*?\s([0-9:\-\s]+)'},

    {"label": "Kim tomonidan yuborilgan", "pattern": r'13\.\s*Kim tomonidan yuborilgan.*?\s([^\n]+)'},

    {"label": "Kasallikning birinchi belgilari", "pattern": r'14\.\s*Kasallikning birinchi kunlaridagi asosiy belgilari\s+([^\n]+)'},

    {"label": "Bemor aniqlandi", "pattern": r'15\.\s*Bemor aniqlandi\s+([^\n]+)'},

    {"label": "Epidemiologik tekshiruv vaqti", "pattern": r'16\.\s*Epidemiologik tekshiruv.*?\s([0-9:\-\s]+)'},

    {"label": "Kuzatuv tamomlangan", "pattern": r'Kuzatuv tamomlangan vaqt\s+([0-9:\-\s]+)'},
]


def parse_pdf(pdf_path: str) -> Dict[str, Any]:
    """Parse Type1 PDF and extract all fields"""

    try:
        with pdfplumber.open(pdf_path) as pdf:
            # Extract text from all pages
            full_text = ""
            for page in pdf.pages:
                full_text += page.extract_text() or ""

            # Extract timeline dates
            timeline = extract_timeline_dates(full_text)

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

            # Add timeline fields
            parsed_fields.extend([
                {"label": "Kasallangan sana", "value": timeline['kasallangan_sana']},
                {"label": "Murojaat etgan vaqt", "value": timeline['murojaat_vaqti']},
                {"label": "Shoshilinch xabarnoma sanasi", "value": timeline['shoshilinch_xabarnoma']},
                {"label": "Kasalxonaga yotqizilgan sana", "value": timeline['yotqizilgan_sana']},
                {"label": "Yakunlovchi tashxis sanasi", "value": timeline['yakunlovchi_sana']},
            ])

            # Add remaining fields
            more_fields = [
                {"label": "Yotqizilgan kasalxona va transport", "pattern": r'22\.\s*Yotqizilgan kasalxona.*?\s([^\n]+)'},
                {"label": "Uyida qoldirilish sababi", "pattern": r'23\.\s*Uyida qoldirilish.*?\s([^\n]+)'},
                {"label": "Laboratoriya tekshiruvi", "pattern": r'25\.\s*Laboratoriya tekshiruvi:\s*([^\n]+)'},
                {"label": "Epidemiolog vrach", "pattern": r'Epidemiolog vrach\s+([^\n]+)'},
            ]

            for field_def in more_fields:
                value = extract(full_text, field_def['pattern'])
                parsed_fields.append({
                    "label": field_def['label'],
                    "value": value
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
