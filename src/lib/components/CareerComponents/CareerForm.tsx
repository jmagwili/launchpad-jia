"use client"

import { useEffect, useRef, useState } from "react";
import InterviewQuestionGeneratorV2 from "./InterviewQuestionGeneratorV2";
import RichTextEditor from "@/lib/components/CareerComponents/RichTextEditor";
import CustomDropdown from "@/lib/components/CareerComponents/CustomDropdown";
import philippineCitiesAndProvinces from "../../../../public/philippines-locations.json";
import { candidateActionToast, errorToast } from "@/lib/Utils";
import { useAppContext } from "@/lib/context/AppContext";
import axios from "axios";
import CareerActionModal from "./CareerActionModal";
import FullScreenLoadingAnimation from "./FullScreenLoadingAnimation";

import { assetConstants, pathConstants } from "@/lib/utils/constantsV2";
import styles from "@/lib/styles/screens/careerForm.module.scss";

  const step = ["Career Details & Team Access", "CV Review & Pre-Screening", "AI Interview Setup", "Review Career"];
  const stepStatus = ["Completed", "Pending", "In Progress"];


  // Setting List icons
  const screeningSettingList = [
    {
        name: "Good Fit and above",
        icon: "la la-check",
    },
    {
        name: "Only Strong Fit",
        icon: "la la-check-double",
    },
    {
        name: "No Automatic Promotion",
        icon: "la la-times",
    },
];
  const screeningQuestionTypes = [
    {
        name: "Short Answer",
        icon: "la la-check",
    },
    {
        name: "Long Answer",
        icon: "la la-check-double",
    },
    {
        name: "Dropdown",
        icon: "la la-times",
    },
    {
        name: "Checkboxes",
        icon: "la la-times",
    },
    {
        name: "Range",
        icon: "la la-times",
    },
];
const workSetupOptions = [
    {
        name: "Fully Remote",
    },
    {
        name: "Onsite",
    },
    {
        name: "Hybrid",
    },
];

const employmentTypeOptions = [
    {
        name: "Full-Time",
    },
    {
        name: "Part-Time",
    },
];

export default function CareerForm({ career, formType, setShowEditModal }: { career?: any, formType: string, setShowEditModal?: (show: boolean) => void }) {
    const { user, orgID } = useAppContext();
    const [jobTitle, setJobTitle] = useState(career?.jobTitle || "");
    const [description, setDescription] = useState(career?.description || "");
    const [workSetup, setWorkSetup] = useState(career?.workSetup || "");
    const [workSetupRemarks, setWorkSetupRemarks] = useState(career?.workSetupRemarks || "");
    const [screeningSetting, setScreeningSetting] = useState(career?.screeningSetting || "Good Fit and above");
    const [employmentType, setEmploymentType] = useState(career?.employmentType || "Full-Time");
    const [requireVideo, setRequireVideo] = useState(career?.requireVideo || true);
    const [salaryNegotiable, setSalaryNegotiable] = useState(career?.salaryNegotiable || true);
    const [minimumSalary, setMinimumSalary] = useState(career?.minimumSalary || "");
    const [maximumSalary, setMaximumSalary] = useState(career?.maximumSalary || "");
    const [screeningQuestions, setScreeningQuestions] = useState<any[]>(career?.screeningQuestions || [
      {
        question: "What is your highest educational attainment?",
        type: "dropdown",
        options: [
          { label: "High School" },
          { label: "College" },
          { label: "Postgraduate" }
        ]
      }
    ]);
    const [suggestedQuestions, setSuggestedQuestions] = useState([
      { 
        category: "Notice Period",
        question: "How long is your notice period?",
        isAdded: false,
      },
      {
        category: "Work Setup",
        question: "How often are you willing to report to the office each week?",
        isAdded: false,
      },
      {
        category: "Asking Salary",
        question: "How much is your expected monthly salary?",
        isAdded: false,
      }
    ]);
    const [interviewScreening, setInterviewScreening] = useState(career?.interviewScreening || "Good Fit and above");
    const [questions, setQuestions] = useState(career?.questions || [
      {
        id: 1,
        category: "CV Validation / Experience",
        questionCountToAsk: null,
        questions: [],
      },
      {
        id: 2,
        category: "Technical",
        questionCountToAsk: null,
        questions: [],
      },
      {
        id: 3,
        category: "Behavioral",
        questionCountToAsk: null,
        questions: [],
      },
      {
        id: 4,
        category: "Analytical",
        questionCountToAsk: null,
        questions: [],
      },
      {
        id: 5,
        category: "Others",
        questionCountToAsk: null,
        questions: [],
      },
    ]);
    const [country, setCountry] = useState(career?.country || "Philippines");
    const [province, setProvince] = useState(career?.province ||"");
    const [city, setCity] = useState(career?.location || "");
    const [provinceList, setProvinceList] = useState([]);
    const [cityList, setCityList] = useState([]);
    const [showSaveModal, setShowSaveModal] = useState("");
    const [isSavingCareer, setIsSavingCareer] = useState(false);
    const savingCareerRef = useRef(false);

    // Determine initial step based on career data
    const determineInitialStep = () => {
        if (!career) return step[0]; // New career, start at step 1

        // Check if all basic info is filled (Step 1)
        const hasBasicInfo = career.jobTitle && career.description && career.workSetup;

        // Check if screening settings are configured (Step 2)
        const hasScreeningSettings = career.screeningSetting;

        // Check if interview questions are configured (Step 3)
        const hasInterviewQuestions = career.questions && career.questions.some(q => q.questions && q.questions.length > 0);

        // Determine which step to start on
        if (hasBasicInfo && hasScreeningSettings && hasInterviewQuestions) {
            return step[3]; // All steps complete, go to Review
        } else if (hasBasicInfo && hasScreeningSettings) {
            return step[2]; // Go to AI Interview Setup
        } else if (hasBasicInfo) {
            return step[1]; // Go to CV Review
        } else {
            return step[0]; // Start at Career Details
        }
    };

    const [currentStep, setCurrentStep] = useState(step[1]); // Start at appropriate step
    const [savedCareerId, setSavedCareerId] = useState(career?._id || null); // Track career ID for updates

    // Accordion States
    const [isCareerDetailsOpen, setIsCareerDetailsOpen] = useState(false);
    const [isCareerDetailsEditing, setIsCareerDetailsEditing] = useState(false);
    const [isCVReviewOpen, setIsCVReviewOpen] = useState(false);
    const [isCVReviewEditing, setIsCVReviewEditing] = useState(false);
    const [isAIInterviewOpen, setIsAIInterviewOpen] = useState(false);
    const [isAIInterviewEditing, setIsAIInterviewEditing] = useState(false);

    // temp variables for edit modal
    const [tempJobTitle, setTempJobTitle] = useState("");
    const [tempEmploymentType, setTempEmploymentType] = useState();
    const [tempWorkSetup, setTempWorkSetup] = useState();
    const [tempCountry, setTempCountry] = useState();
    const [tempProvince, setTempProvince] = useState();
    const [tempCity, setTempCity] = useState("");
    const [tempSalaryNegotiable, setTempSalaryNegotiable] = useState(false);
    const [tempMinimumSalary, setTempMinimumSalary] = useState("");
    const [tempMaximumSalary, setTempMaximumSalary] = useState("");
    const [tempDescription, setTempDescription] = useState();
    const [tempScreeningSetting, setTempScreeningSetting] = useState();
    const [tempInterviewScreening, setTempInterviewScreening] = useState();
    const [tempRequireVideo, setTempRequireVideo] = useState(true);
    const [tempQuestions, setTempQuestions] = useState([]);

    // Check if a specific step is completed
    const isStepCompleted = (stepIndex) => {
        switch(stepIndex) {
            case 0: // Step 1: Career Details & Team Access
                return jobTitle?.trim().length > 0 && description?.trim().length > 0 && workSetup?.trim().length > 0;
            case 1: // Step 2: CV Review & Pre-Screening
                return screeningSetting?.trim().length > 0; // Has screening setting
            case 2: // Step 3: AI Interview Setup
                return questions.some((q) => q.questions && q.questions.length > 0); // Has at least one question
            case 3: // Step 4: Review Career
                return isFormValid(); // Full validation
            default:
                return false;
        }
    };

    function processState(index, isAdvance = false) {
    const currentStepIndex = step.indexOf(currentStep);

    if (currentStepIndex == index) {
      if (index == stepStatus.length - 1) {
        return stepStatus[0];
      }

      return isAdvance ? stepStatus[2] : stepStatus[1];
    }

    // Check if the step is actually completed
    if (currentStepIndex > index) {
      return isStepCompleted(index) ? stepStatus[0] : stepStatus[1];
    }

    return stepStatus[1];
  }


    const isFormValid = () => {
        return jobTitle?.trim().length > 0 && description?.trim().length > 0 && questions.some((q) => q.questions.length > 0) && workSetup?.trim().length > 0;
    }

    // Step-aware validation for "Save and Continue"
    const isCurrentStepValid = () => {
        const currentStepIndex = step.indexOf(currentStep);

        switch(currentStepIndex) {
            case 0: // Step 1: Career Details & Team Access
                return jobTitle?.trim().length > 0 && description?.trim().length > 0 && workSetup?.trim().length > 0;
            case 1: // Step 2: CV Review & Pre-Screening
                return true; // Screening settings have defaults, so always valid
            case 2: // Step 3: AI Interview Setup
                return questions.some((q) => q.questions.length > 0); // Require at least one question
            case 3: // Step 4: Review Career (final step)
                return isFormValid(); // Full validation
            default:
                return false;
        }
    }

    const updateCareer = async (status: string) => {
        if (Number(minimumSalary) && Number(maximumSalary) && Number(minimumSalary) > Number(maximumSalary)) {
            errorToast("Minimum salary cannot be greater than maximum salary", 1300);
            return;
        }
        let userInfoSlice = {
            image: user.image,
            name: user.name,
            email: user.email,
        };
        const updatedCareer = {
            _id: career._id,
            jobTitle,
            description,
            workSetup,
            workSetupRemarks,
            questions,
            lastEditedBy: userInfoSlice,
            status,
            updatedAt: Date.now(),
            screeningSetting,
            requireVideo,
            salaryNegotiable,
            minimumSalary: isNaN(Number(minimumSalary)) ? null : Number(minimumSalary),
            maximumSalary: isNaN(Number(maximumSalary)) ? null : Number(maximumSalary),
            country,
            province,
            // Backwards compatibility
            location: city,
            employmentType,
        }
        try {
            setIsSavingCareer(true);
            const response = await axios.post("/api/update-career", updatedCareer);
            if (response.status === 200) {
                candidateActionToast(
                    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#181D27" }}>Career updated</span>
                    </div>,
                    1300,
                <i className="la la-check-circle" style={{ color: "#039855", fontSize: 32 }}></i>)
                setTimeout(() => {
                    window.location.href = `/recruiter-dashboard/careers/manage/${career._id}`;
                }, 1300);
            }
        } catch (error) {
            console.error(error);
            errorToast("Failed to update career", 1300);
        } finally {
            setIsSavingCareer(false);
        }
    }

  
    const confirmSaveCareer = (status: string) => {
        if (Number(minimumSalary) && Number(maximumSalary) && Number(minimumSalary) > Number(maximumSalary)) {
        errorToast("Minimum salary cannot be greater than maximum salary", 1300);
        return;
        }

        setShowSaveModal(status);
    }

    const saveCareer = async (status: string) => {
        setShowSaveModal("");
        if (!status) {
          return;
        }

        if (!savingCareerRef.current) {
        setIsSavingCareer(true);
        savingCareerRef.current = true;
        let userInfoSlice = {
            image: user.image,
            name: user.name,
            email: user.email,
        };
        const career = {
            jobTitle,
            description,
            workSetup,
            workSetupRemarks,
            questions,
            lastEditedBy: userInfoSlice,
            createdBy: userInfoSlice,
            screeningSetting,
            orgID,
            requireVideo,
            salaryNegotiable,
            minimumSalary: isNaN(Number(minimumSalary)) ? null : Number(minimumSalary),
            maximumSalary: isNaN(Number(maximumSalary)) ? null : Number(maximumSalary),
            country,
            province,
            // Backwards compatibility
            location: city,
            status,
            employmentType,
        }

        try {
            
            const response = await axios.post("/api/add-career", career);
            if (response.status === 200) {
            candidateActionToast(
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#181D27" }}>Career added {status === "active" ? "and published" : ""}</span>
                </div>,
                1300, 
            <i className="la la-check-circle" style={{ color: "#039855", fontSize: 32 }}></i>)
            setTimeout(() => {
                window.location.href = `/recruiter-dashboard/careers`;
            }, 1300);
            }
        } catch (error) {
            errorToast("Failed to add career", 1300);
        } finally {
            savingCareerRef.current = false;
            setIsSavingCareer(false);
        }
      }
    }

    const goToNextStep = () => {
        const currentStepIndex = step.indexOf(currentStep);
        if (currentStepIndex < step.length - 1) {
            setCurrentStep(step[currentStepIndex + 1]);
        }
    };

    const saveDraftAndContinue = async () => {
        if (!isCurrentStepValid()) {
            errorToast("Please fill in all required fields", 1300);
            return;
        }

        if (!savingCareerRef.current) {
            setIsSavingCareer(true);
            savingCareerRef.current = true;

            let userInfoSlice = {
                image: user.image,
                name: user.name,
                email: user.email,
            };

            try {
                let response;

                // If we already have a saved career ID, update it; otherwise, create new
                if (savedCareerId) {
                    // Update existing career
                    const updatedCareer = {
                        _id: savedCareerId,
                        jobTitle,
                        description,
                        workSetup,
                        workSetupRemarks,
                        questions,
                        lastEditedBy: userInfoSlice,
                        screeningSetting,
                        requireVideo,
                        salaryNegotiable,
                        minimumSalary: isNaN(Number(minimumSalary)) ? null : Number(minimumSalary),
                        maximumSalary: isNaN(Number(maximumSalary)) ? null : Number(maximumSalary),
                        country,
                        province,
                        location: city,
                        status: "inactive", // Keep as draft
                        employmentType,
                        interviewScreening,
                        updatedAt: Date.now(),
                    };
                    response = await axios.post("/api/update-career", updatedCareer);
                } else {
                    // Create new career
                    const careerData = {
                        jobTitle,
                        description,
                        workSetup,
                        workSetupRemarks,
                        questions,
                        lastEditedBy: userInfoSlice,
                        createdBy: userInfoSlice,
                        screeningSetting,
                        orgID,
                        requireVideo,
                        salaryNegotiable,
                        minimumSalary: isNaN(Number(minimumSalary)) ? null : Number(minimumSalary),
                        maximumSalary: isNaN(Number(maximumSalary)) ? null : Number(maximumSalary),
                        country,
                        province,
                        location: city,
                        status: "inactive", // Save as draft
                        employmentType,
                        interviewScreening,
                    };
                    response = await axios.post("/api/add-career", careerData);
                    // Save the career ID for future updates
                    if (response.data?.career?._id) {
                        setSavedCareerId(response.data.career._id);
                    }
                }

                if (response.status === 200) {
                    candidateActionToast(
                        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#181D27" }}>Draft saved</span>
                        </div>,
                        1300,
                        <i className="la la-check-circle" style={{ color: "#039855", fontSize: 32 }}></i>
                    );
                    // Navigate to next step instead of redirecting
                    goToNextStep();
                }
            } catch (error) {
                console.error(error);
                errorToast("Failed to save draft", 1300);
            } finally {
                savingCareerRef.current = false;
                setIsSavingCareer(false);
            }
        }
    };

    const handleRemoveOption = (questionIndex: number, optionIndex: number) => {
      setScreeningQuestions(prevQuestions => {
        const updatedQuestions = [...prevQuestions];
        const question = { ...updatedQuestions[questionIndex] };
        question.options = question.options.filter((_, index) => index !== optionIndex);
        updatedQuestions[questionIndex] = question;
        return updatedQuestions;
      });
    };

    const handleDeleteQuestion = (questionIndex: number) => {
      setScreeningQuestions(prevQuestions => 
        prevQuestions.filter((_, index) => index !== questionIndex)
      );
    };

    useEffect(() => {
        const parseProvinces = () => {
          setProvinceList(philippineCitiesAndProvinces.provinces);
          const defaultProvince = philippineCitiesAndProvinces.provinces[0];
          if (!career?.province) {
            setProvince(defaultProvince.name);
          }
          const cities = philippineCitiesAndProvinces.cities.filter((city) => city.province === defaultProvince.key);
          setCityList(cities);
          if (!career?.location) {
            setCity(cities[0].name);
          }
        }
        parseProvinces();
      },[career])

    return (
        <div className="col">
        {formType === "add" ? (<div style={{ marginBottom: "35px", display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <h1 style={{ fontSize: "24px", fontWeight: 550, color: "#111827" }}>Add new career</h1>
              <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px" }}>
                  <button
                  disabled={!isFormValid() || isSavingCareer}
                   style={{ width: "fit-content", color: "#414651", background: "#fff", border: "1px solid #D5D7DA", padding: "8px 16px", borderRadius: "60px", cursor: !isFormValid() || isSavingCareer ? "not-allowed" : "pointer", whiteSpace: "nowrap" }} onClick={() => {
                    confirmSaveCareer("inactive");
                      }}>
                          Save as Unpublished
                  </button>
                  <button
                  disabled={(currentStep === step[3] ? !isFormValid() : !isCurrentStepValid()) || isSavingCareer}
                  style={{ width: "fit-content", background: (currentStep === step[3] ? !isFormValid() : !isCurrentStepValid()) || isSavingCareer ? "#D5D7DA" : "black", color: "#fff", border: "1px solid #E9EAEB", padding: "8px 16px", borderRadius: "60px", cursor: (currentStep === step[3] ? !isFormValid() : !isCurrentStepValid()) || isSavingCareer ? "not-allowed" : "pointer", whiteSpace: "nowrap"}} onClick={() => {
                    currentStep === step[3] ? confirmSaveCareer("active") : saveDraftAndContinue();
                  }}>
                    <i className="la la-check-circle" style={{ color: "#fff", fontSize: 20, marginRight: 8 }}></i>
                      {currentStep === step[3] ? "Save as Published" : "Save and Continue"}
                  </button>
                </div>
        </div>) : (
            <div style={{ marginBottom: "35px", display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 550, color: "#111827" }}>Edit Career Details</h1>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px" }}>
                <button
                 style={{ width: "fit-content", color: "#414651", background: "#fff", border: "1px solid #D5D7DA", padding: "8px 16px", borderRadius: "60px", cursor: "pointer", whiteSpace: "nowrap" }} onClick={() => {
                  setShowEditModal?.(false);
                    }}>
                        Cancel
                </button>
                <button
                  disabled={!isFormValid() || isSavingCareer}
                   style={{ width: "fit-content", color: "#414651", background: "#fff", border: "1px solid #D5D7DA", padding: "8px 16px", borderRadius: "60px", cursor: !isFormValid() || isSavingCareer ? "not-allowed" : "pointer", whiteSpace: "nowrap" }} onClick={() => {
                    updateCareer("inactive");
                    }}>
                          Save Changes as Unpublished
                  </button>
                  <button 
                  disabled={!isFormValid() || isSavingCareer}
                  style={{ width: "fit-content", background: !isFormValid() || isSavingCareer ? "#D5D7DA" : "black", color: "#fff", border: "1px solid #E9EAEB", padding: "8px 16px", borderRadius: "60px", cursor: !isFormValid() || isSavingCareer ? "not-allowed" : "pointer", whiteSpace: "nowrap"}} onClick={() => {
                    updateCareer("active");
                  }}>
                    <i className="la la-check-circle" style={{ color: "#fff", fontSize: 20, marginRight: 8 }}></i>
                      Save Changes as Published
                  </button>
              </div>
       </div>
        )}
        <div className={styles.stepContainer}>
          <div className={styles.step}>
            {step.map((_, index) => (
              <div className={styles.stepBar} key={index}>
                <img
                  alt=""
                  src={
                    assetConstants[
                      processState(index, true)
                        .toLowerCase()
                        .replace(" ", "_")
                    ]
                  }
                />
                {index < step.length - 1 && (
                  <hr
                    className={
                      styles[
                        processState(index).toLowerCase().replace(" ", "_")
                      ]
                    }
                  />
                )}
              </div>
            ))}
          </div>

          <div className={styles.step}>
            {step.map((item, index) => (
              <span
                className={`${styles.stepDetails} ${
                  styles[
                    processState(index, true).toLowerCase().replace(" ", "_")
                  ]
                }`}
                key={index}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
        {currentStep == step[0] && (
          <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", width: "100%", gap: 16, alignItems: "flex-start", marginTop: 16 }}>
          <div style={{ width: "60%", display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="layered-card-outer">
                <div className="layered-card-middle">
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 32, height: 32, backgroundColor: "#181D27", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className="la la-suitcase" style={{ color: "#FFFFFF", fontSize: 20 }}></i>
                    </div>
                        <span style={{fontSize: 16, color: "#181D27", fontWeight: 700}}>1. Career Information</span>
                    </div>
                    <div className="layered-card-content">
                        <div>
                          <span style={{color: "#181D27", fontWeight: 700}}>Basic Information</span>
                        </div>
                        <span>Job Title</span>
                        <input
                        value={jobTitle}
                        className="form-control"
                        placeholder="Enter job title"
                        onChange={(e) => {
                            setJobTitle(e.target.value || "");
                        }}
                        ></input>
                        <div style={{ marginTop: 16}}>
                          <span style={{color: "#181D27", fontWeight: 700}}>Work Setting</span>
                        </div>
                        <div style={{display: "flex", gap: 16}}>
                          <div style={{flex: 1}}>
                            <span>Employment Type</span>
                            <CustomDropdown
                              onSelectSetting={(employmentType) => {
                                  setEmploymentType(employmentType);
                              }}
                              screeningSetting={employmentType}
                              settingList={employmentTypeOptions}
                              placeholder="Select Employment Type"
                            />
                          </div>
                          <div style={{flex: 1}}>
                            <span>Arrangement</span>
                            <CustomDropdown
                              onSelectSetting={(setting) => {
                                  setWorkSetup(setting);
                              }}
                              screeningSetting={workSetup}
                              settingList={workSetupOptions}
                              placeholder="Select Work Setup"
                            />
                          </div>
                        </div>
                        <div style={{ marginTop: 16}}>
                          <span style={{color: "#181D27", fontWeight: 700}}>Location</span>
                        </div>
                        <div style={{display: "flex", gap: 16}}>
                          <div style={{flex: 1}}>
                            <span>Country</span>
                            <CustomDropdown
                              onSelectSetting={(setting) => {
                                  setCountry(setting);
                              }}
                              screeningSetting={country}
                              settingList={[]}
                              placeholder="Select Country"
                            />
                          </div>
                          <div style={{flex: 1}}>
                            <span>State / Province</span>
                            <CustomDropdown
                              onSelectSetting={(province) => {
                                  setProvince(province);
                                  const provinceObj = provinceList.find((p) => p.name === province);
                                  const cities = philippineCitiesAndProvinces.cities.filter((city) => city.province === provinceObj.key);
                                  setCityList(cities);
                                  setCity(cities[0].name);
                              }}
                              screeningSetting={province}
                              settingList={provinceList}
                              placeholder="Select State / Province"
                            />
                          </div>
                          <div style={{flex: 1}}>
                            <span>City</span>
                            <CustomDropdown
                              onSelectSetting={(city) => {
                                  setCity(city);
                              }}
                              screeningSetting={city}
                              settingList={cityList}
                              placeholder="Select City"
                            />
                          </div>
                        </div> 
                        <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between" }}>
                          <span style={{color: "#181D27", fontWeight: 700}}>Salary</span>
                          <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 8, minWidth: "130px" }}>
                            <label className="switch">
                                <input type="checkbox" checked={salaryNegotiable} onChange={() => setSalaryNegotiable(!salaryNegotiable)} />
                                <span className="slider round"></span>
                            </label>
                              <span>{salaryNegotiable ? "Negotiable" : "Fixed"}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 16 }}>
                          <div style={{flex: 1}}>
                            <span>Minimum Salary</span>
                            <div style={{ position: "relative" }}>
                              <span
                                style={{
                                  position: "absolute",
                                  left: "12px",
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  color: "#6c757d",
                                  fontSize: "16px",
                                  pointerEvents: "none",
                                }}
                              >
                                P
                              </span>
                              <input
                                type="number"
                                className="form-control"
                                style={{ paddingLeft: "28px" }}
                                placeholder="0"
                                min={0}
                                value={minimumSalary}
                                onChange={(e) => {
                                  setMinimumSalary(e.target.value || "");
                                }}
                              />
                              <span style={{
                                position: "absolute",
                                right: "30px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "#6c757d",
                                fontSize: "16px",
                                pointerEvents: "none",
                              }}>
                                PHP
                              </span>
                            </div>
                          </div>
                          <div style={{flex: 1}}>
                            <span>Maximum Salary</span>
                            <div style={{ position: "relative" }}>
                              <span
                                style={{
                                position: "absolute",
                                left: "12px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "#6c757d",
                                fontSize: "16px",
                                pointerEvents: "none",
                                }}
                              >
                              P
                              </span>
                              <input
                                type="number"
                                className="form-control"
                                style={{ paddingLeft: "28px" }}
                                placeholder="0"
                                min={0}
                                value={maximumSalary}
                                onChange={(e) => {
                                  setMaximumSalary(e.target.value || "");
                                }}
                              ></input>
                              <span style={{
                                position: "absolute",
                                right: "30px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "#6c757d",
                                fontSize: "16px",
                                pointerEvents: "none",
                              }}>
                                PHP
                              </span>
                            </div>
                          </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="layered-card-outer">
              <div className="layered-card-middle">
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, backgroundColor: "#181D27", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className="la la-suitcase" style={{ color: "#FFFFFF", fontSize: 20 }}></i>
                  </div>
                  <span style={{fontSize: 16, color: "#181D27", fontWeight: 700}}>2. Job Description</span>
                </div>
                  <div className="layered-card-content">
                    <RichTextEditor setText={setDescription} text={description} />
                  </div>
              </div>
            </div>
          </div>

          <div style={{ width: "40%", display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="layered-card-outer">
              <div className="layered-card-middle">
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, backgroundColor: "#181D27", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className="la la-suitcase" style={{ color: "#FFFFFF", fontSize: 20 }}></i>
                  </div>
                  <span style={{fontSize: 16, color: "#181D27", fontWeight: 700}}>Tips</span>
                </div>
                  <div className="layered-card-content">
                    <div>
                      <span style={{fontSize: 16, color: "#181D27", fontWeight: 700}}>Use clear, standard job titles </span>
                      <span>
                        for better searchability (e.g., "Software Engineer" instead of "Code Ninja" or "Tech Rockstar").
                      </span>
                    </div>
                      <div>
                      <span style={{fontSize: 16, color: "#181D27", fontWeight: 700}}>Avoid abbreviations </span>
                      <span>
                        or internal role codes that applicants might not understand (e.g., user "QA Engineer" instead of "QE II" or "QA-TL").
                      </span>
                    </div>
                    <div>
                      <span style={{fontSize: 16, color: "#181D27", fontWeight: 700}}>Keep it concise </span>
                      <span>
                        — job titles should be no more than a few words (2 - 4 max), avoiding fluff or marketing terms.
                      </span>
                    </div>
                  </div>
              </div>
            </div>
          {/* <div className="layered-card-outer">
                <div className="layered-card-middle">
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 32, height: 32, backgroundColor: "#181D27", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className="la la-cog" style={{ color: "#FFFFFF", fontSize: 20 }}></i>
                    </div>
                        <span style={{fontSize: 16, color: "#181D27", fontWeight: 700}}>Settings</span>
                    </div>
                    <div className="layered-card-content">
                        <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
                          <i className="la la-id-badge" style={{ color: "#414651", fontSize: 20 }}></i>
                          <span>Screening Setting</span>
                        </div>
                        <CustomDropdown
                        onSelectSetting={(setting) => {
                            setScreeningSetting(setting);
                        }}
                        screeningSetting={screeningSetting}
                        settingList={screeningSettingList}
                        />
                        <span>This settings allows Jia to automatically endorse candidates who meet the chosen criteria.</span>
                        <div style={{ display: "flex", flexDirection: "row",justifyContent: "space-between", gap: 8 }}>
                            <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
                                <i className="la la-video" style={{ color: "#414651", fontSize: 20 }}></i>
                                <span>Require Video Interview</span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                                <label className="switch">
                                    <input type="checkbox" checked={requireVideo} onChange={() => setRequireVideo(!requireVideo)} />
                                    <span className="slider round"></span>
                                </label>
                                <span>{requireVideo ? "Yes" : "No"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="layered-card-outer">
                <div className="layered-card-middle">
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 32, height: 32, backgroundColor: "#181D27", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className="la la-ellipsis-h" style={{ color: "#FFFFFF", fontSize: 20 }}></i>
                    </div>
                        <span style={{fontSize: 16, color: "#181D27", fontWeight: 700}}>Additional Information</span>
                    </div>
                    <div className="layered-card-content">
                        <span style={{fontSize: 16, color: "#181D27", fontWeight: 700}}>Work Setting</span>
                        <span>Employment Type</span>
                        <CustomDropdown
                        onSelectSetting={(employmentType) => {
                            setEmploymentType(employmentType);
                        }}
                        screeningSetting={employmentType}
                        settingList={employmentTypeOptions}
                        placeholder="Select Employment Type"
                        />

                        <span>Work Setup Arrangement</span>
                        <CustomDropdown
                        onSelectSetting={(setting) => {
                            setWorkSetup(setting);
                        }}
                        screeningSetting={workSetup}
                        settingList={workSetupOptions}
                        placeholder="Select Work Setup"
                        />

                        <span>Work Setup Remarks</span>
                        <input
                          className="form-control"
                          placeholder="Additional remarks about work setup (optional)"
                          value={workSetupRemarks}
                          onChange={(e) => {
                            setWorkSetupRemarks(e.target.value || "");
                          }}
                        ></input>

                        <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
                            <span style={{fontSize: 16, color: "#181D27", fontWeight: 700}}>Salary</span>

                            <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 8, minWidth: "130px" }}>
                                <label className="switch">
                                    <input type="checkbox" checked={salaryNegotiable} onChange={() => setSalaryNegotiable(!salaryNegotiable)} />
                                    <span className="slider round"></span>
                                </label>
                                <span>{salaryNegotiable ? "Negotiable" : "Fixed"}</span>
                            </div>
                        </div>

                        <span>Minimum Salary</span>
                        <div style={{ position: "relative" }}>
                          <span
                            style={{
                              position: "absolute",
                              left: "12px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              color: "#6c757d",
                              fontSize: "16px",
                              pointerEvents: "none",
                            }}
                          >
                            P
                          </span>
                          <input
                            type="number"
                            className="form-control"
                            style={{ paddingLeft: "28px" }}
                            placeholder="0"
                            min={0}
                            value={minimumSalary}
                            onChange={(e) => {
                              setMinimumSalary(e.target.value || "");
                            }}
                          />
                        <span style={{
                          position: "absolute",
                          right: "30px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#6c757d",
                          fontSize: "16px",
                          pointerEvents: "none",
                        }}>
                          PHP
                        </span>
                        </div>

                        <span>Maximum Salary</span>
                        <div style={{ position: "relative" }}>
                        <span
                            style={{
                              position: "absolute",
                              left: "12px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              color: "#6c757d",
                              fontSize: "16px",
                              pointerEvents: "none",
                            }}
                          >
                            P
                          </span>
                        <input
                          type="number"
                          className="form-control"
                          style={{ paddingLeft: "28px" }}
                          placeholder="0"
                          min={0}
                          value={maximumSalary}
                          onChange={(e) => {
                            setMaximumSalary(e.target.value || "");
                          }}
                        ></input>
                        <span style={{
                          position: "absolute",
                          right: "30px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#6c757d",
                          fontSize: "16px",
                          pointerEvents: "none",
                        }}>
                          PHP
                        </span>
                        </div>


                        <span style={{fontSize: 16, color: "#181D27", fontWeight: 700}}>Location</span>

                        <span>Country</span>
                        <CustomDropdown
                        onSelectSetting={(setting) => {
                            setCountry(setting);
                        }}
                        screeningSetting={country}
                        settingList={[]}
                        placeholder="Select Country"
                        />

                        <span>State / Province</span>
                        <CustomDropdown
                        onSelectSetting={(province) => {
                            setProvince(province);
                            const provinceObj = provinceList.find((p) => p.name === province);
                            const cities = philippineCitiesAndProvinces.cities.filter((city) => city.province === provinceObj.key);
                            setCityList(cities);
                            setCity(cities[0].name);
                        }}
                        screeningSetting={province}
                        settingList={provinceList}
                        placeholder="Select State / Province"
                        />

                        <span>City</span>
                        <CustomDropdown
                        onSelectSetting={(city) => {
                            setCity(city);
                        }}
                        screeningSetting={city}
                        settingList={cityList}
                        placeholder="Select City"
                        />
                    </div>
                </div>
            </div> */}
          </div>
        </div>

        )}

        {currentStep == step[1] && (
          <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", width: "100%", gap: 16, alignItems: "flex-start", marginTop: 16 }}>
          <div style={{ width: "60%", display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="layered-card-outer">
                <div className="layered-card-middle">
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 32, height: 32, backgroundColor: "#181D27", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className="la la-suitcase" style={{ color: "#FFFFFF", fontSize: 20 }}></i>
                    </div>
                        <span style={{fontSize: 16, color: "#181D27", fontWeight: 700}}>1. CV Review Settings</span>
                    </div>
                    <div className="layered-card-content">
                        <div>
                          <span style={{color: "#181D27", fontWeight: 700}}>CV Screening</span>
                        </div>
                        <div style={{marginBottom: 10}}>
                          <span>Jia automatically endorses canditates who meet the chosen criteria</span>
                        </div>
                        <CustomDropdown
                          onSelectSetting={(setting) => {
                              setScreeningSetting(setting);
                          }}
                          screeningSetting={screeningSetting}
                          settingList={screeningSettingList}
                        />
                    </div>
                </div>
            </div>
            <div className="layered-card-outer">
              <div className="layered-card-middle">
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 32, height: 32, backgroundColor: "#181D27", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className="la la-suitcase" style={{ color: "#FFFFFF", fontSize: 20 }}></i>
                    </div>
                        <span style={{fontSize: 16, color: "#181D27", fontWeight: 700}}>2. Pre-Screening Questions</span>
                        <span>(optional)</span>
                    </div>
                    <div className="layered-card-content">
                      { screeningQuestions.length === 0 ? (
                        "No pre-screening questions added yet."
                      ) : (
                        screeningQuestions.map((question: any, index: number) => (
                          <div key={index} className="layered-card-middle" style={{padding: 0, border: "1px solid #e9eaeb", overflow: "hidden", minHeight: 300}}>
                            <div style={{ height: "60px", padding: "0 20px" , display: "flex", flexDirection: "row", justifyContent: "space-between" ,alignItems: "center", gap: 8 }}>
                              <span>{question.question}</span>
                              <div style={{ width: "250px", flexShrink: 0 }}>
                                <CustomDropdown
                                  onSelectSetting={(setting) => {
                                    setScreeningSetting(setting);
                                  }}
                                  screeningSetting={screeningSetting}
                                  settingList={screeningQuestionTypes}
                                />
                              </div>
                            </div>
                            <div className="layered-card-content" style={{borderRadius: "0 0 10px 10px", border: "none", flex: 1, gap: 0}}>
                              {
                              // Replace strict equality with a case-insensitive check and guard options
                              (question.type && question.type.toString().toLowerCase() === "dropdown") && (
                                <>
                                {Array.isArray(question.options) && question.options.length > 0 ? (
                                  question.options.map((option, idx) => (
                                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20}}>
                                      <div style={{ height: 40, display: "flex", flex: 1, alignItems: "center", margin: "4px 0", border: "1px solid #e9eaeb", borderRadius: "8px"}}>
                                        <span style={{height:"100%", width: 40 ,display: "flex", justifyContent: "center", alignItems: "center", borderRight: "1px solid #e9eaeb"}}>{idx + 1}</span>
                                        <span style={{padding: "0 20px", flex: 1}}>{option.label}</span>
                                      </div>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();  // Prevent event bubbling
                                          handleRemoveOption(index, idx);
                                        }}
                                        style={{
                                          height: 30, 
                                          width: 30, 
                                          borderRadius: "100%", 
                                          border: "1px solid #e9eaeb", 
                                          backgroundColor: "inherit", 
                                          cursor: "pointer", 
                                          color: "#525f7f",
                                          fontWeight: 600,
                                          fontSize: 14,
                                        }}
                                      >X</button>
                                    </div>
                                  ))
                                ) : (
                                  <p style={{ color: "#6a6a6a" }}>No options available.</p>
                                )}
                                <button
                                  style={{
                                  height: 40,
                                  width: 150,
                                  border: "none",
                                  backgroundColor: "inherit",
                                  cursor: "pointer",
                                  color: "#525f7f",
                                  marginTop: "8px",
                                  fontWeight: 500,
                                  }}
                                >
                                  + Add Option
                                </button>
                                <hr style={{margin: "15px 0"}}/>
                                <div style={{display: "flex", justifyContent: "flex-end"}}>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteQuestion(index);
                                    }}
                                    style={{
                                      backgroundColor: "white", 
                                      border: "solid 1px #B32318", 
                                      borderRadius: "9999px", 
                                      padding: "4px 12px", 
                                      cursor: "pointer", 
                                      color: "#B32318",
                                      fontWeight: 600
                                    }}
                                  >
                                    Delete Question
                                  </button>
                                </div>
                                </>
                              )
                              }
                            </div>
                          </div>
                        ))
                      ) }
                      <hr style={{margin: "10px 0"}}/>
                        <div>
                          <span style={{fontWeight: 700}}>Suggested Pre-screening Questions:</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between"}}>
                          <div style={{ width: "100%" }}>
                            {suggestedQuestions.map((question, index) => (
                              <div key={index} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "12px 0" }}>
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                  <span style={{fontWeight: 700}}>{question.category}</span>
                                  <span>{question.question}</span>
                                </div>
                                <button
                                  style={{ 
                                    backgroundColor: "inherit", 
                                    border: "solid 1px #525f7f", 
                                    borderRadius: "9999px", 
                                    padding: "4px 12px", 
                                    cursor: "pointer", 
                                    color: "#525f7f",
                                    fontWeight: 600
                                  }}
                                  
                                >
                                  Add
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                    </div>
                </div>
            </div>
          </div>

          <div style={{ width: "40%", display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="layered-card-outer">
              <div className="layered-card-middle">
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, backgroundColor: "#181D27", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className="la la-suitcase" style={{ color: "#FFFFFF", fontSize: 20 }}></i>
                  </div>
                  <span style={{fontSize: 16, color: "#181D27", fontWeight: 700}}>Tips</span>
                </div>
                  <div className="layered-card-content">
                    <div>
                      <span style={{fontSize: 16, color: "#181D27", fontWeight: 700}}>Add a Secret Prompt </span>
                      <span>
                        to fine-tune how Jia scores and evaluates submitted CVs.
                      </span>
                    </div>
                      <div>
                      <span style={{fontSize: 16, color: "#181D27", fontWeight: 700}}>Add Pre-Screening Questions </span>
                      <span>
                        to collect key details such as notice period, work setup, or salary expectations to guide your review and candidate discussions.
                      </span>
                    </div>
                  </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {currentStep == step[2] && (
          <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", width: "100%", gap: 16, alignItems: "flex-start", marginTop: 16 }}>
          <div style={{ width: "60%", display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="layered-card-outer">
                <div className="layered-card-middle">
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 32, height: 32, backgroundColor: "#181D27", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className="la la-suitcase" style={{ color: "#FFFFFF", fontSize: 20 }}></i>
                    </div>
                        <span style={{fontSize: 16, color: "#181D27", fontWeight: 700}}>1. AI Interview Settings</span>
                    </div>
                    <div className="layered-card-content">
                        <div>
                          <span style={{color: "#181D27", fontWeight: 700}}>AI Interview Screening</span>
                        </div>
                        <div style={{marginBottom: 10}}>
                          <span>Jia automatically endorses canditates who meet the chosen criteria</span>
                        </div>
                        <CustomDropdown
                          onSelectSetting={(setting) => {
                              setInterviewScreening(setting);
                          }}
                          screeningSetting={interviewScreening}
                          settingList={screeningSettingList}
                        />

                        <hr style={{ margin: "16px 0" }} />

                        <div>
                          <span style={{color: "#181D27", fontWeight: 700}}>Require Video on Interview</span>
                        </div>
                        <div>
                          <span>Require candidates to keep their camera on. Recordings will appear on their analysis page.</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "row",justifyContent: "space-between", gap: 8, marginTop: 8 }}>
                            <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
                                <i className="la la-video" style={{ color: "#414651", fontSize: 20 }}></i>
                                <span>Require Video Interview</span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                                <label className="switch">
                                    <input type="checkbox" checked={requireVideo} onChange={() => setRequireVideo(!requireVideo)} />
                                    <span className="slider round"></span>
                                </label>
                                <span>{requireVideo ? "Yes" : "No"}</span>
                            </div>
                        </div>
                    </div>
                </div>
              </div>
              <InterviewQuestionGeneratorV2 questions={questions} setQuestions={(questions) => setQuestions(questions)} jobTitle={jobTitle} description={description} />
          </div>

          <div style={{ width: "40%", display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="layered-card-outer">
              <div className="layered-card-middle">
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, backgroundColor: "#181D27", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className="la la-suitcase" style={{ color: "#FFFFFF", fontSize: 20 }}></i>
                  </div>
                  <span style={{fontSize: 16, color: "#181D27", fontWeight: 700}}>Tips</span>
                </div>
                  <div className="layered-card-content">
                    <div>
                      <span style={{fontSize: 16, color: "#181D27", fontWeight: 700}}>Add a Secret Prompt </span>
                      <span>
                        to fine-tune how Jia scores and evaluates submitted CVs.
                      </span>
                    </div>
                      <div>
                      <span style={{fontSize: 16, color: "#181D27", fontWeight: 700}}>Add Pre-Screening Questions </span>
                      <span>
                        to collect key details such as notice period, work setup, or salary expectations to guide your review and candidate discussions.
                      </span>
                    </div>
                  </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {currentStep == step[3] && (
          <div style={{ display: "flex", flexDirection: "row", justifyContent: "center", width: "100%", gap: 16, alignItems: "flex-start", marginTop: 16 }}>
            <div style={{ width: "90%", display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="layered-card-middle">
                {/* HEADER */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    cursor: "pointer",  
                  }}
                  onClick={() => setIsCareerDetailsOpen(!isCareerDetailsOpen)}
                >
                  {/* TITLE + ICON + TOGGLE */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          transition: "transform 0.3s ease",
                          transform: isCareerDetailsOpen ? "rotate(-180deg)" : "rotate(0deg)",
                          fontSize: 22,
                          lineHeight: 1, // helps keep the 'v' vertically centered
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "0 5px"
                        }}
                      >
                        v
                      </div>
                  </div>

                    <div
                      style={{
                        width: 32,
                        height: 32,
                        backgroundColor: "#181D27",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <i
                        className="la la-suitcase"
                        style={{ color: "#FFFFFF", fontSize: 20 }}
                      ></i>
                    </div>

                    <span
                      style={{
                        fontSize: 16,
                        color: "#181D27",
                        fontWeight: 700,
                      }}
                    >
                      Career Details & Team Access
                    </span>
                  </div>

                  {/* EDIT BUTTON */}
                  <button
                    onClick={() => {
                      setTempJobTitle(jobTitle);
                      setTempEmploymentType(employmentType);
                      setTempWorkSetup(workSetup);
                      setTempCountry(country);
                      setTempProvince(province);
                      setTempCity(city);
                      setTempSalaryNegotiable(salaryNegotiable);
                      setTempMinimumSalary(minimumSalary);
                      setTempMaximumSalary(maximumSalary);
                      setTempDescription(description);
                      setIsCareerDetailsEditing(true);
                    }}
                    style={{
                      background: "none",
                      border: "1px solid #181D27",
                      padding: "4px 10px",
                      borderRadius: 8,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>
                </div>

                {/* ACCORDION CONTENT (animated) */}
                <div
                  style={{
                    overflow: "hidden",
                    maxHeight: isCareerDetailsOpen ? "" : "0px",
                    opacity: isCareerDetailsOpen ? 1 : 0,
                    transition: "max-height 0.4s ease, opacity 0.3s ease",
                    marginTop: isCareerDetailsOpen ? 12 : 0,
                  }}
                >
                  <div className="layered-card-content">
                    <div style={{fontWeight:700, color: "#181D27"}}> 
                      <span>Job Title</span>
                    </div>
                    <div> 
                      <span>{jobTitle}</span>
                    </div>
                    <hr style={{ margin: "10px 0" }} />
                    <div style={{ display: "flex", flexDirection: "row", gap: 20 }}> 
                      <div style={{flex: 1}}>
                        <div style={{fontWeight:700, color: "#181D27"}}> 
                          <span>Employment Type</span>
                        </div>
                        <div> 
                          <span>{employmentType}</span>
                        </div>
                      </div>
                      <div style={{flex: 1}}>
                        <div style={{fontWeight:700, color: "#181D27"}}> 
                          <span>Work Arrangement</span>
                        </div>
                        <div> 
                          <span>{workSetup}</span>
                        </div>
                      </div>
                      <div style={{flex: 1}} />
                    </div>
                    <hr style={{ margin: "10px 0" }} />
                    <div style={{ display: "flex", flexDirection: "row", gap: 20 }}> 
                      <div style={{flex: 1}}>
                        <div style={{fontWeight:700, color: "#181D27"}}> 
                          <span>Country</span>
                        </div>
                        <div> 
                          <span>{country}</span>
                        </div>
                      </div>
                      <div style={{flex: 1}}>
                        <div style={{fontWeight:700, color: "#181D27"}}> 
                          <span>State / Province</span>
                        </div>
                        <div> 
                          <span>{province}</span>
                        </div>
                      </div>
                      <div style={{flex: 1}}>
                        <div style={{fontWeight:700, color: "#181D27"}}> 
                          <span>City</span>
                        </div>
                        <div> 
                          <span>{city}</span>
                        </div>
                      </div>
                    </div>
                    <hr style={{ margin: "10px 0" }} />
                    <div style={{ display: "flex", flexDirection: "row", gap: 20 }}> 
                      <div style={{flex: 1}}>
                        <div style={{fontWeight:700, color: "#181D27"}}> 
                          <span>Minimum Salary</span>
                        </div>
                        <div> 
                          <span>{minimumSalary}</span>
                        </div>
                      </div>
                      <div style={{flex: 1}}>
                        <div style={{fontWeight:700, color: "#181D27"}}> 
                          <span>Maximum Salary</span>
                        </div>
                        <div> 
                          <span>{maximumSalary}</span>
                        </div>
                      </div>
                      <div style={{flex: 1}} />
                    </div>
                    <hr style={{ margin: "10px 0" }} />
                    <div style={{fontWeight:700, color: "#181D27"}}> 
                      <span>Job Description</span>
                    </div>
                    <div> 
                      <span>{description}</span>
                    </div>
                  </div>
                </div>

                {/* EDIT MODAL */}
                {isCareerDetailsEditing && (
                  <div
                    style={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      width: "100vw",
                      height: "100vh",
                      background: "rgba(0,0,0,0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 20,
                      zIndex: 99,
                    }}
                  >
                    <div
                      style={{
                        background: "#fff",
                        padding: 20,
                        borderRadius: 12,
                        width: "100%",
                        maxWidth: 700,
                      }}
                    >
                      <h3>Edit Career Details & Team Access</h3>

                     <div className="layered-card-content" style={{ maxHeight: "400px", overflowY: "auto" }}>
                        <div>
                          <span style={{color: "#181D27", fontWeight: 700}}>Basic Information</span>
                        </div>
                        <span>Job Title</span>
                        <input
                        value={tempJobTitle}
                        className="form-control"
                        placeholder="Enter job title"
                        onChange={(e) => {
                            setTempJobTitle(e.target.value || "");
                        }}
                        ></input>
                        <div style={{ marginTop: 16}}>
                          <span style={{color: "#181D27", fontWeight: 700}}>Work Setting</span>
                        </div>
                        <div style={{display: "flex", gap: 16}}>
                          <div style={{flex: 1}}>
                            <span>Employment Type</span>
                            <CustomDropdown
                              onSelectSetting={(employmentType) => {
                                  setTempEmploymentType(employmentType);
                              }}
                              screeningSetting={tempEmploymentType}
                              settingList={employmentTypeOptions}
                              placeholder="Select Employment Type"
                            />
                          </div>
                          <div style={{flex: 1}}>
                            <span>Arrangement</span>
                            <CustomDropdown
                              onSelectSetting={(setting) => {
                                  setTempWorkSetup(setting);
                              }}
                              screeningSetting={tempWorkSetup}
                              settingList={workSetupOptions}
                              placeholder="Select Work Setup"
                            />
                          </div>
                        </div>
                        <div style={{ marginTop: 16}}>
                          <span style={{color: "#181D27", fontWeight: 700}}>Location</span>
                        </div>
                        <div style={{display: "flex", gap: 16}}>
                          <div style={{flex: 1}}>
                            <span>Country</span>
                            <CustomDropdown
                              onSelectSetting={(setting) => {
                                  setTempCountry(setting);
                              }}
                              screeningSetting={tempCountry}
                              settingList={[]}
                              placeholder="Select Country"
                            />
                          </div>
                          <div style={{flex: 1}}>
                            <span>State / Province</span>
                            <CustomDropdown
                              onSelectSetting={(province) => {
                                  setTempProvince(province);
                                  const provinceObj = provinceList.find((p) => p.name === province);
                                  const cities = philippineCitiesAndProvinces.cities.filter((city) => city.province === provinceObj.key);
                                  setCityList(cities);
                                  setTempCity(cities[0].name);
                              }}
                              screeningSetting={tempProvince}
                              settingList={provinceList}
                              placeholder="Select State / Province"
                            />
                          </div>
                          <div style={{flex: 1}}>
                            <span>City</span>
                            <CustomDropdown
                              onSelectSetting={(city) => {
                                  setTempCity(city);
                              }}
                              screeningSetting={tempCity}
                              settingList={cityList}
                              placeholder="Select City"
                            />
                          </div>
                        </div> 
                        <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between" }}>
                          <span style={{color: "#181D27", fontWeight: 700}}>Salary</span>
                          <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 8, minWidth: "130px" }}>
                            <label className="switch">
                                <input type="checkbox" checked={tempSalaryNegotiable} onChange={() => setTempSalaryNegotiable(!tempSalaryNegotiable)} />
                                <span className="slider round"></span>
                            </label>
                              <span>{tempSalaryNegotiable ? "Negotiable" : "Fixed"}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 16 }}>
                          <div style={{flex: 1}}>
                            <span>Minimum Salary</span>
                            <div style={{ position: "relative" }}>
                              <span
                                style={{
                                  position: "absolute",
                                  left: "12px",
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  color: "#6c757d",
                                  fontSize: "16px",
                                  pointerEvents: "none",
                                }}
                              >
                                P
                              </span>
                              <input
                                type="number"
                                className="form-control"
                                style={{ paddingLeft: "28px" }}
                                placeholder="0"
                                min={0}
                                value={tempMinimumSalary}
                                onChange={(e) => {
                                  setTempMinimumSalary(e.target.value || "");
                                }}
                              />
                              <span style={{
                                position: "absolute",
                                right: "30px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "#6c757d",
                                fontSize: "16px",
                                pointerEvents: "none",
                              }}>
                                PHP
                              </span>
                            </div>
                          </div>
                          <div style={{flex: 1}}>
                            <span>Maximum Salary</span>
                            <div style={{ position: "relative" }}>
                              <span
                                style={{
                                position: "absolute",
                                left: "12px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "#6c757d",
                                fontSize: "16px",
                                pointerEvents: "none",
                                }}
                              >
                              P
                              </span>
                              <input
                                type="number"
                                className="form-control"
                                style={{ paddingLeft: "28px" }}
                                placeholder="0"
                                min={0}
                                value={tempMaximumSalary}
                                onChange={(e) => {
                                  setTempMaximumSalary(e.target.value || "");
                                }}
                              ></input>
                              <span style={{
                                position: "absolute",
                                right: "30px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "#6c757d",
                                fontSize: "16px",
                                pointerEvents: "none",
                              }}>
                                PHP
                              </span>
                            </div>
                          </div>
                        </div>
                        <div style={{ color: "#181D27", fontWeight: 700, marginTop: 16, marginBottom: 10 }}>
                          <span>Job Description</span>
                        </div>
                        <div>
                          <RichTextEditor
                            setText={setTempDescription}
                            text={tempDescription}
                          />
                        </div>
                    </div>

                      <div
                        style={{
                          marginTop: 16,
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: 8,
                        }}
                      >
                        <button
                          onClick={() => setIsCareerDetailsEditing(false)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 6,
                            border: "1px solid #999",
                            background: "#eee",
                          }}
                        >
                          Cancel
                        </button>

                        <button
                          onClick={() => {
                            setJobTitle(tempJobTitle);
                            setEmploymentType(tempEmploymentType);
                            setWorkSetup(tempWorkSetup);
                            setCountry(tempCountry);
                            setProvince(tempProvince);
                            setCity(tempCity);
                            setSalaryNegotiable(tempSalaryNegotiable);
                            setMinimumSalary(tempMinimumSalary);
                            setMaximumSalary(tempMaximumSalary);
                            setDescription(tempDescription);
                            setIsCareerDetailsEditing(false);
                          }}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 6,
                            border: "none",
                            background: "#181D27",
                            color: "#fff",
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="layered-card-middle">
                {/* HEADER */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    cursor: "pointer",  
                  }}
                  onClick={() => setIsCVReviewOpen(!isCVReviewOpen)}
                >
                  {/* TITLE + ICON + TOGGLE */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          transition: "transform 0.3s ease",
                          transform: isCVReviewOpen ? "rotate(-180deg)" : "rotate(0deg)",
                          fontSize: 22,
                          lineHeight: 1, // helps keep the 'v' vertically centered
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "0 5px"
                        }}
                      >
                        v
                      </div>
                  </div>

                    <div
                      style={{
                        width: 32,
                        height: 32,
                        backgroundColor: "#181D27",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <i
                        className="la la-suitcase"
                        style={{ color: "#FFFFFF", fontSize: 20 }}
                      ></i>
                    </div>

                    <span
                      style={{
                        fontSize: 16,
                        color: "#181D27",
                        fontWeight: 700,
                      }}
                    >
                      CV Review & Pre-Screening Questions
                    </span>
                  </div>

                  {/* EDIT BUTTON */}
                  <button
                    onClick={() => {
                      setIsCVReviewEditing(true);
                      setTempScreeningSetting(screeningSetting);
                    }}
                    style={{
                      background: "none",
                      border: "1px solid #181D27",
                      padding: "4px 10px",
                      borderRadius: 8,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>
                </div>

                {/* ACCORDION CONTENT (animated) */}
                <div
                  style={{
                    overflow: "hidden",
                    maxHeight: isCVReviewOpen ? "" : "0px",
                    opacity: isCVReviewOpen ? 1 : 0,
                    transition: "max-height 0.4s ease, opacity 0.3s ease",
                    marginTop: isCVReviewOpen ? 12 : 0,
                  }}
                >
                  <div className="layered-card-content">
                    <div style={{fontWeight:700, color: "#181D27"}}> 
                      <span>CV Screening</span>
                    </div>
                    <div>
                      <span>
                        {
                          screeningSetting == "No Automatic Promotion" 
                          ? `${screeningSetting}` 
                          : `Automatically endorse candidates who are ${screeningSetting}`
                        }
                      </span>
                    </div>
                    <hr style={{margin: "10px 0"}} />
                    <div style={{fontWeight:700, color: "#181D27"}}> 
                      <span>Pre-Screening Questions</span>
                    </div>
                  </div>
                </div>

                {/* EDIT MODAL */}
                {isCVReviewEditing && (
                  <div
                    style={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      width: "100vw",
                      height: "100vh",
                      background: "rgba(0,0,0,0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 20,
                      zIndex: 99,
                    }}
                  >
                    <div
                      style={{
                        background: "#fff",
                        padding: 20,
                        borderRadius: 12,
                        width: "100%",
                        maxWidth: 700,
                      }}
                    >
                      <h3>Edit CV Review & Pre-Screening Questions</h3>

                     <div className="layered-card-content" style={{ maxHeight: "400px", overflowY: "auto" }}>
                      <div className="layered-card-content">
                        <div>
                          <span style={{color: "#181D27", fontWeight: 700}}>CV Screening</span>
                        </div>
                        <div style={{marginBottom: 10}}>
                          <span>Jia automatically endorses canditates who meet the chosen criteria</span>
                        </div>
                        <CustomDropdown
                          onSelectSetting={(setting) => {
                              setTempScreeningSetting(setting);
                          }}
                          screeningSetting={tempScreeningSetting}
                          settingList={screeningSettingList}
                        />
                      </div>
                     </div>

                      <div
                        style={{
                          marginTop: 16,
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: 8,
                        }}
                      >
                        <button
                          onClick={() => setIsCVReviewEditing(false)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 6,
                            border: "1px solid #999",
                            background: "#eee",
                          }}
                        >
                          Cancel
                        </button>

                        <button
                          onClick={() => {
                            setIsCVReviewEditing(false);
                            setScreeningSetting(tempScreeningSetting);
                          }}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 6,
                            border: "none",
                            background: "#181D27",
                            color: "#fff",
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="layered-card-middle">
                {/* HEADER */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    cursor: "pointer",  
                  }}
                  onClick={() => setIsAIInterviewOpen(!isAIInterviewOpen)}
                >
                  {/* TITLE + ICON + TOGGLE */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          transition: "transform 0.3s ease",
                          transform: isAIInterviewOpen ? "rotate(-180deg)" : "rotate(0deg)",
                          fontSize: 22,
                          lineHeight: 1, // helps keep the 'v' vertically centered
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "0 5px"
                        }}
                      >
                        v
                      </div>
                  </div>

                    <div
                      style={{
                        width: 32,
                        height: 32,
                        backgroundColor: "#181D27",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <i
                        className="la la-suitcase"
                        style={{ color: "#FFFFFF", fontSize: 20 }}
                      ></i>
                    </div>

                    <span
                      style={{
                        fontSize: 16,
                        color: "#181D27",
                        fontWeight: 700,
                      }}
                    >
                      AI Interview Setup
                    </span>
                  </div>

                  {/* EDIT BUTTON */}
                  <button
                    onClick={() => {
                      setIsAIInterviewEditing(true);
                      setTempInterviewScreening(interviewScreening);
                      setTempRequireVideo(requireVideo);
                      setTempQuestions(questions);
                    }}
                    style={{
                      background: "none",
                      border: "1px solid #181D27",
                      padding: "4px 10px",
                      borderRadius: 8,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>
                </div>

                {/* ACCORDION CONTENT (animated) */}
                <div
                  style={{
                    overflow: "hidden",
                    maxHeight: isAIInterviewOpen ? "" : "0px",
                    opacity: isAIInterviewOpen ? 1 : 0,
                    transition: "max-height 0.4s ease, opacity 0.3s ease",
                    marginTop: isAIInterviewOpen ? 12 : 0,
                  }}
                >
                  <div className="layered-card-content">
                    <div style={{fontWeight:700, color: "#181D27"}}> 
                      <span>AI Interview Screening</span>
                    </div>
                    <div>
                      <span>
                        {
                          interviewScreening == "No Automatic Promotion" 
                          ? `${interviewScreening}` 
                          : `Automatically endorse candidates who are ${interviewScreening}`
                        }
                      </span>
                    </div>

                    <hr style={{margin: "10px 0"}} />

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{color: "#181D27", fontWeight: 700}}>Require Video on Interview</span>
                      <span>{requireVideo ? "yes" : "no"}</span>
                    </div>

                    <hr style={{ margin: "16px 0" }} />

                    <div style={{fontWeight:700, color: "#181D27"}}> 
                      <span>Interview Questions</span>
                    </div>

                      {(() => {
                        // Counter to track question numbers across all categories
                        let globalIndex = 1;

                        return questions.map((categoryGroup) => (
                          <div key={categoryGroup.id} >
                            <h3 style={{ fontWeight: 700, color: "#181D27" }}>{categoryGroup.category}</h3>

                            {categoryGroup.questions && categoryGroup.questions.length > 0 ? (
                              <ul style={{ marginLeft: "1.5rem", listStyleType: "none", paddingLeft: 0 }}>
                                {categoryGroup.questions.map((q) => {
                                  const currentIndex = globalIndex++;
                                  return (
                                    <li key={q.id}>
                                      {currentIndex}. {q.question}
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : (
                              <p style={{ marginLeft: "1.5rem" }}>No questions yet.</p>
                            )}
                          </div>
                        ));
                      })()}
                  </div>
                </div>

                {/* EDIT MODAL */}
                {isAIInterviewEditing && (
                  <div
                    style={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      width: "100vw",
                      height: "100vh",
                      background: "rgba(0,0,0,0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 20,
                      zIndex: 99,
                    }}
                  >
                    <div
                      style={{
                        background: "#fff",
                        padding: 20,
                        borderRadius: 12,
                        width: "100%",
                        maxWidth: 700,
                      }}
                    >
                      <h3>Edit AI Interview Setup</h3>

                     <div className="layered-card-content" style={{ maxHeight: "400px", overflowY: "auto" }}>
                                             <div>
                          <span style={{color: "#181D27", fontWeight: 700}}>AI Interview Screening</span>
                        </div>
                        <div style={{marginBottom: 10}}>
                          <span>Jia automatically endorses canditates who meet the chosen criteria</span>
                        </div>
                        <CustomDropdown
                          onSelectSetting={(setting) => {
                              setTempInterviewScreening(setting);
                          }}
                          screeningSetting={tempInterviewScreening}
                          settingList={screeningSettingList}
                        />

                        <hr style={{ margin: "16px 0" }} />

                        <div>
                          <span style={{color: "#181D27", fontWeight: 700}}>Require Video on Interview</span>
                        </div>
                        <div>
                          <span>Require candidates to keep their camera on. Recordings will appear on their analysis page.</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "row",justifyContent: "space-between", gap: 8, marginTop: 8 }}>
                            <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
                                <i className="la la-video" style={{ color: "#414651", fontSize: 20 }}></i>
                                <span>Require Video Interview</span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                                <label className="switch">
                                    <input type="checkbox" checked={tempRequireVideo} onChange={() => setTempRequireVideo(!tempRequireVideo)} />
                                    <span className="slider round"></span>
                                </label>
                                <span>{requireVideo ? "Yes" : "No"}</span>
                            </div>
                        </div>
                        <InterviewQuestionGeneratorV2 questions={tempQuestions} setQuestions={(questions) => setTempQuestions(questions)} jobTitle={jobTitle} description={description} />
                     </div>

                      <div
                        style={{
                          marginTop: 16,
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: 8,
                        }}
                      >
                        <button
                          onClick={() => setIsAIInterviewEditing(false)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 6,
                            border: "1px solid #999",
                            background: "#eee",
                          }}
                        >
                          Cancel
                        </button>

                        <button
                          onClick={() => {
                            setIsAIInterviewEditing(false);
                            setInterviewScreening(tempInterviewScreening);
                            setRequireVideo(tempRequireVideo);
                            setQuestions(tempQuestions);
                          }}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 6,
                            border: "none",
                            background: "#181D27",
                            color: "#fff",
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
        </div>
        )}

      {showSaveModal && (
         <CareerActionModal action={showSaveModal} onAction={(action) => saveCareer(action)} />
        )}
    {isSavingCareer && (
        <FullScreenLoadingAnimation title={formType === "add" ? "Saving career..." : "Updating career..."} subtext={`Please wait while we are ${formType === "add" ? "saving" : "updating"} the career`} />
    )}
    </div>
    )
}