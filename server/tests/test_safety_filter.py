from duo_server.persona.safety_filter import flag_clinical_language


def test_flags_prescriptive_phrase():
    flagged = flag_clinical_language("You should increase your reps to feel better.")
    assert flagged


def test_flags_diagnostic_phrase():
    flagged = flag_clinical_language("That sounds like it could be a diagnosable issue.")
    assert flagged


def test_does_not_flag_encouraging_reply():
    flagged = flag_clinical_language("Nice! You showed up and gave it a shot, that counts.")
    assert flagged == []


def test_does_not_flag_deflection_reply():
    flagged = flag_clinical_language("That's one for your physio. I'm here for the fun part.")
    assert flagged == []
