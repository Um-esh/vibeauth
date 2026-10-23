from typing import Dict, Any, List, Set
from backend.app.utils.text_processing import (
    extract_entities,
    extract_numbers,
    extract_dates,
    extract_contact_info
)

class EntityValidator:
    """
    Validates factual preservation between original and rewritten text:
    - Named entities (people, companies, locations, acronyms)
    - Numbers, percentages, currency, quantities
    - Dates and deadlines
    - URLs and emails
    """

    @classmethod
    def validate_entities(cls, original_text: str, rewritten_text: str) -> Dict[str, Any]:
        """Compares named entities between original and rewritten text."""
        orig_entities = extract_entities(original_text)
        rewr_text_lower = rewritten_text.lower()
        
        preserved = []
        missing = []
        
        for ent in orig_entities:
            # Check for direct inclusion or normalized match
            ent_lower = ent.lower()
            if ent_lower in rewr_text_lower:
                preserved.append(ent)
            else:
                # Check for individual significant parts if multi-word (e.g. Dr. John Smith -> Smith)
                parts = ent.split()
                if len(parts) > 1 and any(len(p) > 3 and p.lower() in rewr_text_lower for p in parts):
                    preserved.append(f"{ent} (partial match)")
                else:
                    missing.append(ent)
                    
        # Check newly introduced entities
        rewr_entities = extract_entities(rewritten_text)
        orig_text_lower = original_text.lower()
        new_entities = [e for e in rewr_entities if e.lower() not in orig_text_lower]
        
        passed = len(missing) == 0
        
        return {
            'passed': passed,
            'original_entities': orig_entities,
            'preserved_entities': preserved,
            'missing_entities': missing,
            'newly_introduced_entities': new_entities,
            'preservation_rate': round(len(preserved) / len(orig_entities), 2) if orig_entities else 1.0,
            'warning': f"Missing {len(missing)} named entities: {', '.join(missing)}" if missing else None
        }

    @classmethod
    def validate_numbers(cls, original_text: str, rewritten_text: str) -> Dict[str, Any]:
        """Compares numerical quantities, currency, and percentages."""
        orig_numbers = extract_numbers(original_text)
        rewr_text_lower = rewritten_text.lower()
        
        preserved = []
        missing = []
        
        for num in orig_numbers:
            # Normalize comparisons (e.g., $1,000 -> 1000 or 1,000)
            clean_num = num.replace(',', '').lower()
            num_lower = num.lower()
            
            if num_lower in rewr_text_lower or clean_num in rewr_text_lower:
                preserved.append(num)
            else:
                # Also check digit-only stripped comparison
                digits = ''.join(c for c in num if c.isdigit())
                if digits and digits in rewr_text_lower:
                    preserved.append(num)
                else:
                    missing.append(num)
                    
        rewr_numbers = extract_numbers(rewritten_text)
        new_numbers = []
        for r_num in rewr_numbers:
            if r_num.lower() not in [n.lower() for n in orig_numbers]:
                # Verify digit not present in original
                r_digits = ''.join(c for c in r_num if c.isdigit())
                orig_digits = ''.join(c for c in original_text if c.isdigit())
                if r_digits and r_digits not in orig_digits:
                    new_numbers.append(r_num)
                    
        passed = len(missing) == 0 and len(new_numbers) == 0
        
        warning = None
        if missing and new_numbers:
            warning = f"Numbers modified or omitted: missing {missing}, added {new_numbers}"
        elif missing:
            warning = f"Numerical values missing from output: {', '.join(missing)}"
        elif new_numbers:
            warning = f"Newly introduced numerical values detected: {', '.join(new_numbers)}"

        return {
            'passed': passed,
            'original_numbers': orig_numbers,
            'preserved_numbers': preserved,
            'missing_numbers': missing,
            'new_numbers': new_numbers,
            'preservation_rate': round(len(preserved) / len(orig_numbers), 2) if orig_numbers else 1.0,
            'warning': warning
        }

    @classmethod
    def validate_dates(cls, original_text: str, rewritten_text: str) -> Dict[str, Any]:
        """Compares dates, deadlines, and temporal markers."""
        orig_dates = extract_dates(original_text)
        rewr_text_lower = rewritten_text.lower()
        
        preserved = []
        missing = []
        
        for date_val in orig_dates:
            if date_val.lower() in rewr_text_lower:
                preserved.append(date_val)
            else:
                missing.append(date_val)
                
        passed = len(missing) == 0
        
        return {
            'passed': passed,
            'original_dates': orig_dates,
            'preserved_dates': preserved,
            'missing_dates': missing,
            'preservation_rate': round(len(preserved) / len(orig_dates), 2) if orig_dates else 1.0,
            'warning': f"Dates or deadlines omitted: {', '.join(missing)}" if missing else None
        }

    @classmethod
    def validate_contacts(cls, original_text: str, rewritten_text: str) -> Dict[str, Any]:
        """Checks URLs and emails preservation."""
        orig_contacts = extract_contact_info(original_text)
        rewr_text_lower = rewritten_text.lower()
        
        missing_urls = [u for u in orig_contacts['urls'] if u.lower() not in rewr_text_lower]
        missing_emails = [e for e in orig_contacts['emails'] if e.lower() not in rewr_text_lower]
        
        passed = len(missing_urls) == 0 and len(missing_emails) == 0
        warnings = []
        if missing_urls:
            warnings.append(f"Missing URLs: {', '.join(missing_urls)}")
        if missing_emails:
            warnings.append(f"Missing Emails: {', '.join(missing_emails)}")
            
        return {
            'passed': passed,
            'original_urls': orig_contacts['urls'],
            'original_emails': orig_contacts['emails'],
            'missing_urls': missing_urls,
            'missing_emails': missing_emails,
            'warning': '; '.join(warnings) if warnings else None
        }
