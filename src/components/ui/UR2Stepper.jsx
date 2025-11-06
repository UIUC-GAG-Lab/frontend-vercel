// UR2Stepper.jsx
import React from "react";
import PropTypes from "prop-types";
import { Stepper, Step, StepLabel, Box, StepConnector } from "@mui/material";
import { styled } from "@mui/material/styles";

const STATUS_COLORS = {
  done:   "#10B981", // green-500 (success)
  active: "#3B82F6", // blue-500 (in progress)
  waiting:"#9CA3AF", // gray-400 (idle)
  failed: "#EF4444", // red-500 (error)
};

// Custom connector (line between bubbles)
const ColorConnector = styled(StepConnector)(({ theme }) => ({
  "&.MuiStepConnector-alternativeLabel": {
    top: 20,
    left: "calc(-50% + 25px)",
    right: "calc(50% + 25px)",
  },
  "& .MuiStepConnector-line": {
    borderTopWidth: 3,
    borderColor: "#d1d5db", // default grey
  },
  "&.Mui-active .MuiStepConnector-line": {
    borderColor: STATUS_COLORS.active,
  },
  "&.Mui-completed .MuiStepConnector-line": {
    borderColor: STATUS_COLORS.done,
  },
}));

// Bubble renderer (MUI passes icon/active/completed/error via StepIconProps)
function StatusStepIcon({ icon, status }) {
  const bg = STATUS_COLORS[status] || STATUS_COLORS.waiting;
  return (
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: bg,
        color: "#fff",
        fontWeight: 700,
        fontSize: 16,
      }}
    >
      {icon}
    </Box>
  );
}

StatusStepIcon.propTypes = {
  icon: PropTypes.node,
  status: PropTypes.oneOf(["waiting", "active", "done", "failed"]),
};

// Compute per-step status from currentStage / interruption
function computeStatus(index, currentStage, total, isInterrupted) {
  if (total <= 0) return "waiting";

  // Completed-all case
  if (currentStage >= total && !isInterrupted) {
    return "done";
  }

  if (isInterrupted) {
    // Last completed is currentStage-1 (clamped)
    const lastCompleted = Math.max(-1, Math.min(currentStage - 1, total - 1));
    if (index <= lastCompleted) return "done";
    return "failed"; // everything after last completed is failed
  }

  // Normal running
  if (index < currentStage) return "done";
  if (index === currentStage && currentStage < total) return "active";
  return "waiting";
}


export default function UR2Stepper({
  stages,
  currentStage,
  isInterrupted = false,
}) {

  const items = Array.isArray(stages) && stages.length > 0? stages : [];

  const total = items.length;

  // For MUI's notion of "active step" (to color connectors), clamp to last index (or 0 if empty).
  const activeIndex = Math.min(Math.max(0, currentStage), Math.max(0, total - 1));

  return (
    <Box sx={{ width: "100%", maxWidth: 1000 }}>
      <Stepper
        activeStep={activeIndex}
        alternativeLabel
        connector={<ColorConnector />}
      >
        {items.map((title, idx) => {
          const status = computeStatus(idx, currentStage, total, isInterrupted);

          // Wrap to inject the status for this specific step
          const StepIconWithStatus = (props) => (
            <StatusStepIcon {...props} status={status} />
          );

          const muiCompleted = status === "done";
          const muiActive = status === "active";
          const isError = status === "failed";

          return (
            <Step
              key={`${idx}-${title}`}
              completed={muiCompleted}
              active={muiActive}
              error={isError}               // `error` changes MUI label color; we still control bubble via icon
            >
              <StepLabel
                slots={{ stepIcon: StepIconWithStatus }}
                sx={{ "& .MuiStepLabel-label": { mt: 1 } }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    lineHeight: 1.2,
                  }}
                  >
                  <span style={{ fontSize: 14, whiteSpace: "pre-line" }}>
                    {
                      title==="Image Capture" ? "Aluminum Image\nCapture": title
                    }
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      marginTop: 5,
                      textTransform: "capitalize",
                      color:
                        status === "done"
                          ? STATUS_COLORS.done
                          : status === "active"
                          ? STATUS_COLORS.active
                          : status === "failed"
                          ? STATUS_COLORS.failed
                          : "#6b7280",
                    }}
                  >
                    {status}
                  </span>
                </Box>
              </StepLabel>
            </Step>
          );
        })}
      </Stepper>
    </Box>
  );
}

UR2Stepper.propTypes = {
  stages: PropTypes.arrayOf(PropTypes.string),
  currentStage: PropTypes.number.isRequired, // 0-based index; >= length means finished
  isInterrupted: PropTypes.bool,
};

UR2Stepper.defaultProps = {
  stages: undefined,
  isInterrupted: false,
};





// // UR2Stepper.jsx

// import React from "react";
// import PropTypes from "prop-types";
// import { Stepper, Step, StepLabel, Box, StepConnector } from "@mui/material";
// import { styled } from "@mui/material/styles";


// const STATUS_COLORS = {
//   done:   "#10B981", // green-500 (success, calming)
//   active: "#3B82F6", // blue-500 (highlighted, focus)
//   waiting:"#9CA3AF", // gray-400 (neutral, subtle)
//   failed: "#EF4444", // red-500 (error, strong alert)
// };

// // Custom connector (line between bubbles)
// const ColorConnector = styled(StepConnector)(({ theme }) => ({
//   "&.MuiStepConnector-alternativeLabel": {
//     top: 20,                      
//     left: "calc(-50% + 25px)",    
//     right: "calc(50% + 25px)",    
//   },
//   "& .MuiStepConnector-line": {
//     borderTopWidth: 3,
//     borderColor: "#d1d5db",       // default grey
//   },
//   "&.Mui-active .MuiStepConnector-line": {
//     borderColor: STATUS_COLORS.active, // left of the active bubble
//   },
//   "&.Mui-completed .MuiStepConnector-line": {
//     borderColor: STATUS_COLORS.done,   // left of completed bubbles
//   },
// }));


// // Active step from statuses
// function mainActiveIndex(state) {
//   const order = ["s1", "s2", "s3", "s4", "s5", "s6"];
//   const activeIdx = order.findIndex((k) => state[k] === "active");
//   if (activeIdx >= 0) return activeIdx;
//   const doneCount = order.filter((k) => state[k] === "done").length;
//   return Math.min(doneCount, order.length - 1);
// }

// // Bubble renderer (MUI passes icon/active/completed/error via StepIconProps)
// function StatusStepIcon({ icon, status }) {
//   const bg = STATUS_COLORS[status] || STATUS_COLORS.waiting;
//   return (
//     <Box
//       sx={{
//         width: 40,
//         height: 40,
//         borderRadius: "50%",
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         backgroundColor: bg,
//         color: "#fff",
//         fontWeight: 700,
//         fontSize: 16,
//       }}
//     >
//       {icon}
//     </Box>
//   );
// }

// StatusStepIcon.propTypes = {
//   icon: PropTypes.node,
//   status: PropTypes.oneOf(["waiting", "active", "done", "failed"]),
// };

// export default function UR2Stepper({ state }) {
//   const current = state || UR2Stepper.defaultProps.state;

//   const steps = [
//     { title: "Sample Preparation", key: "s1" },
//     { title: "Dissolution", key: "s2" },
//     { title: "Filtration & Dilution", key: "s3" },
//     { title: "Color Agent Addition", key: "s4" },
//     { title: "Image Capture", key: "s5" },
//   ];

//   const activeIndex = mainActiveIndex(current);

//   return (
//     <Box sx={{ width: "100%", maxWidth: 1100 }}>
//       <Stepper activeStep={activeIndex} alternativeLabel connector={<ColorConnector />}>
//         {steps.map((step) => {
//           const stepStatus = current[step.key] || "waiting";

//           // Wrap to inject the status for this specific step
//           const StepIconWithStatus = (props) => (
//             <StatusStepIcon {...props} status={stepStatus} />
//           );

//           return (
//             <Step key={step.key}>
//               <StepLabel
//                 slots={{ stepIcon: StepIconWithStatus }}  
//                 sx={{ "& .MuiStepLabel-label": { mt: 1 } }}
//               >
//                 {/* (title) then (status) under the bubble */}
//                 <Box
//                   sx={{
//                     display: "flex",
//                     flexDirection: "column",
//                     alignItems: "center",
//                     lineHeight: 1.2,
//                   }}
//                 >
//                   <span style={{ fontSize: 14 }}>{step.title}</span>
//                   <span
//                     style={{
//                       fontSize: 12,
//                       marginTop: 4,
//                       textTransform: "capitalize",
//                       color: "#6b7280",
//                     }}
//                   >
//                     {stepStatus}
//                   </span>
//                 </Box>
//               </StepLabel>
//             </Step>
//           );
//         })}
//       </Stepper>
//     </Box>
//   );
// }

// UR2Stepper.propTypes = {
//   state: PropTypes.shape({
//     s1: PropTypes.oneOf(["waiting", "active", "done", "failed"]),
//     s2: PropTypes.oneOf(["waiting", "active", "done", "failed"]),
//     s3: PropTypes.oneOf(["waiting", "active", "done", "failed"]),
//     s4: PropTypes.oneOf(["waiting", "active", "done", "failed"]),
//     s5: PropTypes.oneOf(["waiting", "active", "done", "failed"]),
//     s6: PropTypes.oneOf(["waiting", "active", "done", "failed"]),
//   }),
// };

// UR2Stepper.defaultProps = {
//   state: {
//     s1: "done",
//     s2: "done",
//     s3: "done",
//     s4: "active",
//     s5: "waiting",
//     s6: "waiting",
//   },
// };
