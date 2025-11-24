#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Type3 PDF Parser - Qisqacha forma
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


# Field definitions for Type3
FIELD_DEFS = [
    {"label": "№", "pattern": r'№\s+(\d+)'},
    {"label": "Birlamchi tashxis", "pattern": r'1\.\s*Birlamchi tashxis\s+([^\n]+)'},
    {"label": "Bemor (mahalliy / kelgan)", "pattern": r'3\.\s*Bemor:\s+([A-Za-zА-Яа-я\s]+)'},
    {"label": "F.I.SH", "pattern": r'4\.\s*F\.I\.SH\s+(.+?)(?:\n|$)'},
    {"label": "Jinsi", "pattern": r'5\.\s*Jinsi\s+([A-Za-zА-Яа-я]+)'},
    {"label": "Tug'ilgan sanasi", "pattern": r'6\.\s*Tug\'ilgan sanasi\s+([0-9\-]+(?:\s+yil)?)'},
    {"label": "Doimiy yashash joyi", "pattern": r'7\.\s*Doimiy yashash joyi:\s*([^\n]+)'},
    {"label": "Hozirgi yashash joyi", "pattern": r'8\.\s*Hozirgi yashash joyi:\s*([^\n]+)'},
    {"label": "Ishlash / O'qish joyi", "pattern": r'9\.\s*Ishlash, o\'qish joyi.*?\s*([^\n]+)'},
    {"label": "Turar joyi bo'yicha davolash muassasasi", "pattern": r'11\.\s*Turar joyi bo\'yicha davolash muassasasi:\s*([^\n]+)'},
    {"label": "Bemor haqida habar olingan sana", "pattern": r'12\.\s*Bemor haqida habar.*?\s([0-9:\-\s]+)'},
    {"label": "Kim tomonidan yuborilgan", "pattern": r'13\.\s*Kim tomonidan yuborilgan.*?\s([^\n]+)'},
    {"label": "Kasallikning birinchi belgilari", "pattern": r'14\.\s*Kasallikning birinchi.*?belgilari\s+([^\n]+)'},
    {"label": "Bemor aniqlandi", "pattern": r'15\.\s*Bemor aniqlandi\s+([^\n]+)'},
    {"label": "Epidemiologik tekshiruv vaqti", "pattern": r'16\.\s*Epidemiologik tekshiruv.*?\s([0-9:\-\s]+)'},
    {"label": "Kasallangan sana", "pattern": r'17\.\s*Kasallangan.*?\s([0-9\-:\s]+)'},
    {"label": "Murojaat etgan vaqt", "pattern": r'18\.\s*Murojaat etgan vaqt.*?\s([0-9\-:\s]+)'},
    {"label": "Shoshilinch xabarnoma sanasi", "pattern": r'19\.\s*Shoshilinch xabarnoma.*?\s([0-9\-:\s]+)'},
    {"label": "Kasalxonaga yotqizilgan sana", "pattern": r'20\.\s*Kasalxonaga yotqizilgan.*?\s([0-9\-]+)'},
    {"label": "Yakunlovchi tashxis sanasi", "pattern": r'21\.\s*Yakunlovchi tashxis.*?\s([0-9\-]+)'},
    {"label": "Yotqizilgan kasalxona", "pattern": r'22\.\s*Yotqizilgan kasalxona.*?\s([^\n]+)'},
    {"label": "Uyida qoldirilish sababi", "pattern": r'23\.\s*Uyida qoldirilish.*?\s([^\n]+)'},
    {"label": "Laboratoriya tekshiruvi", "pattern": r'25\.\s*Laboratoriya tekshiruvi:\s*([^\n]+)'},
    {"label": "Oxirgi emlash haqida ma'lumot", "pattern": r'26\.\s*Oxirgi emlash.*?\s([^\n]+)'},
    {"label": "Epidemiolog vrach", "pattern": r'Epidemiolog vrach\s+([^\n]+)'},
    {"label": "Kartani topshirilgan vaqt", "pattern": r'Kartani.*?topshirilgan vaqt\s*([0-9\-]+)'},
]


def parse_pdf(pdf_path: str) -> Dict[str, Any]:
    """Parse Type3 PDF and extract all fields"""

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
