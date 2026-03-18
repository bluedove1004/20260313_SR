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
            "일반침": ("('acupuncture'/exp OR 'acupuncture') "
                      "OR ('acupuncture point'/exp OR 'acupuncture point') "
                      "OR acupoint* "
                      "OR 'body acupuncture' "
                      "OR (scalp AND acupuncture) "
                      "OR ('dry needling'/exp OR 'dry needling') "
                      "OR ('trigger point'/exp OR 'trigger point')"),
            "전침": ("('electroacupuncture'/exp OR 'electroacupuncture') "
                     "OR 'electro-acupuncture' "
                     "OR (electric AND acupuncture)"),
            "봉약침": ("('bee venom'/exp OR 'bee venom') "
                      "OR ('apitherapy'/exp OR 'apitherapy') "
                      "OR apiotherapy "
                      "OR apipuncture "
                      "OR ('pharmacopuncture'/exp OR 'pharmacopuncture') "
                      "OR ('pharmacoacupuncture'/exp OR pharmacoacupuncture) "
                      "OR aquapuncture "
                      "OR (aqua AND ('acupuncture'/exp OR acupuncture)) "
                      "OR (herbal AND ('acupuncture'/exp OR acupuncture)) "
                      "OR (hydro AND ('acupuncture'/exp OR acupuncture))"),
            "뜸": ("('moxibustion'/exp OR 'moxibustion') "
                  "OR ('artemisia'/exp OR 'artemisia') "
                  "OR moxa*"),
            "추나": ("('chiropractic manipulation'/exp OR 'chiropractic manipulation') "
                      "OR ('chiropractic'/exp OR 'chiropractic') "
                      "OR ('massage'/exp OR 'massage') "
                      "OR ('massotherapy'/exp OR massotherapy) "
                      "OR ('tuina'/exp OR tuina) "
                      "OR chuna"),
            "부항": ("('bloodletting'/exp OR 'bloodletting') "
                      "OR ('blood letting'/exp OR 'blood letting') "
                      "OR ('cupping therapy'/exp OR 'cupping therapy') "
                      "OR ventouse "
                      "OR ('phlebotomy'/exp OR 'phlebotomy') "
                      "OR ('venesection'/exp OR venesection) "
                      "OR (spilled AND ('blood'/exp OR blood))"),
            "매선": ("(catgut OR thread) "
                      "AND (acupoint OR acupunture OR needle)")
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
