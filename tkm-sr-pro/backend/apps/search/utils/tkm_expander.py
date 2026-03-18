class TKMExpander:
    def __init__(self):
        # Mocks a TKM Thesaurus mapping
        self.tkm_prescriptions = {
            "소요산": [
                '"Xiaoyao San"', '"Xiaoyao"', '"Jiawei Xiaoyao"',
                '"Radix Bupleuri"', '"Radix Angelicae Sinensis"', '"Radix Paeoniae Alba"',
                '"Rhizoma Atractylodis Macrocephalae"', '"Poria"', '"Radix Glycyrrhizae"'
            ]
        }
        
        self.tkm_categories = {
            "전체": "",
            "한약": ("('chinese medicine'/exp OR 'chinese medicine') "
                     "OR ('chinese medicinal formula'/exp OR 'chinese medicinal formula') "
                     "OR ('korean medicine'/exp OR 'korean medicine') "
                     "OR ('kampo medicine drug'/exp OR 'kampo medicine drug') "
                     "OR ('herbal medicine'/exp OR 'herbal medicine') "
                     "OR ('medicinal plant'/exp OR 'medicinal plant') "
                     "OR ('herbaceous agent'/exp OR 'herbaceous agent')"),
            "일반침": '("Acupuncture"[MeSH] OR "Acupuncture Therapy"[MeSH])',
            "전침": '("Electroacupuncture"[MeSH] OR "Electro-acupuncture")',
            "봉약침": '("Pharmacopuncture" OR "Acupuncture, Pharmacological" OR "Bee Venoms"[MeSH])',
            "뜸": '("Moxibustion"[MeSH])',
            "추나": '("Tuina" OR "Chuna" OR "Manipulation, Orthopedic"[MeSH])',
            "부항": '("Cupping Therapy" OR "Cupping")',
            "매선": '("Thread Embedding" OR "Catgut Embedding" OR "Acupoint Thread Embedding")'
        }

    def expand(self, query: str, category: str = "전체") -> str:
        base_expansion = ""
        
        # 1. Expand standard TKM prescriptions if found
        clean_query = query.strip()
        if clean_query in self.tkm_prescriptions:
            terms = self.tkm_prescriptions[clean_query]
            base_expansion = f'("{clean_query}" OR ' + " OR ".join(terms) + ')'
        else:
            if " " in clean_query:
                base_expansion = f'"{clean_query}"'
            else:
                base_expansion = clean_query
                
        # 2. Add category constraint
        cat_expansion = self.tkm_categories.get(category, "")
        
        if cat_expansion:
            return f"({base_expansion}) AND {cat_expansion}"
        else:
            return base_expansion
