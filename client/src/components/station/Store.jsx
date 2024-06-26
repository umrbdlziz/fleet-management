import { useState, useRef, useEffect, useContext } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  Box,
} from "@mui/material";
import axios from "axios";
import { ServerContext, AuthContext } from "../../context";
import Layout from "../Layout";
import ItemDetails from "../ItemDetails";
import ListComponent from "./ListComponent";
import CustomDialog from "../utils/CustomDialog";
import CustomSnackbar from "../utils/CustomSnackbar";

const Store = () => {
  const [displayStartButton, setDisplayStartButton] = useState(true);
  const [storeData, setStoreData] = useState(null);
  const [greenPigeonhole, setGreenPigeonhole] = useState([]);
  const [itemData, setItemData] = useState(null);
  const [scanItemCode, setScanItemCode] = useState("");
  const [scanPigeonholeId, setScanPigeonholeId] = useState("");
  const [isInputOne, setIsInputOne] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [storeNumbers, setStoreNumbers] = useState([]);
  const [selectedStoreNo, setSelectedStoreNo] = useState(null);
  const [dataSend, setDataSend] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState({});
  const [currStoreList, setCurrStoreList] = useState([]);
  const [isBtnActionClick, setIsBtnActionClick] = useState(false);

  const { SERVER_URL } = useContext(ServerContext);
  const { userInfo } = useContext(AuthContext);

  const item_codeRef = useRef(null);
  const pigeonhole_idRef = useRef(null);

  useEffect(() => {
    if (!userInfo) {
      console.log("userInfo is null");
    } else {
      console.log("userInfo:", userInfo.id);
    }
  }, [userInfo]);

  useEffect(() => {
    if (isBtnActionClick) {
      const enterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
      });
      item_codeRef.current.dispatchEvent(enterEvent);
      setIsBtnActionClick(false);
    }

    if (isInputOne) {
      document.addEventListener("keydown", handleItemCodeInput);
    } else {
      document.addEventListener("keydown", handlePigeonholeIdInput);
    }

    // Cleanup function to remove the event listener
    return () => {
      document.removeEventListener("keydown", handleItemCodeInput);
      document.removeEventListener("keydown", handlePigeonholeIdInput);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanItemCode, scanPigeonholeId, isInputOne, isBtnActionClick]);

  const handleStartClick = async () => {
    setDisplayStartButton(false);
    setOpenDialog(true);

    try {
      const response = await axios.get(`${SERVER_URL}/store/get_store_numbers`);
      setStoreNumbers(response.data);
    } catch (error) {
      console.error("Error fetching stores:", error);
    }
  };

  const handleStoreSelect = async (store_no) => {
    try {
      const response = await axios.get(
        `${SERVER_URL}/store/get_store_data?store_no=${store_no}`
      );
      setStoreData(response.data);
      getListItem(store_no);
    } catch (error) {
      console.error("Error fetching store data:", error);
    }
    setSelectedStoreNo(store_no);
    setOpenDialog(false);
  };

  const getListItem = async (no) => {
    try {
      const response = await axios.get(
        `${SERVER_URL}/store/get_store_list?store_no=${no}`
      );
      setCurrStoreList(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  const handleItemCodeInput = async (event) => {
    if (event.key === "Enter" || isBtnActionClick) {
      console.log("item code: ", scanItemCode);

      const isItemCodeInStoreList = currStoreList.some(
        (item) => item.item_code === scanItemCode
      );

      if (!isItemCodeInStoreList) {
        setDialogOpen(true);
        setDialogMessage({
          title: "Error",
          content: `Item code(${scanItemCode}) not found in store list.`,
        });
        setScanItemCode("");
        return;
      }

      // to get the item image name and green pigeonhole
      try {
        const response = await axios.get(
          `${SERVER_URL}/store/get_item_info?item_code=${scanItemCode}&store_no=${selectedStoreNo}`
        );

        if (response.data.message) {
          console.log("Message in handleItemCodeInput:", response.data.message);
          setScanItemCode("");
          return;
        }
        setGreenPigeonhole(
          response.data.pigeonhole.map((item) => item.pigeonhole_id)
        );
        console.log("Item info:", response.data);
        setItemData(response.data.itemInfo);

        setIsInputOne(false);
      } catch (error) {
        console.log("Error fetching item info:", error);
        setScanItemCode("");
      }
    } else if (event.key === "Backspace") {
      setScanItemCode(scanItemCode.slice(0, -1));
    } else if (
      event.key !== "Shift" &&
      event.key !== "Tab" &&
      event.key !== "CapsLock" &&
      event.key !== "Alt"
    ) {
      setScanItemCode(scanItemCode + event.key);
    }
  };

  const handlePigeonholeIdInput = async (event) => {
    if (event.key === "Enter") {
      console.log("pigeonhole id: ", scanPigeonholeId);

      if (!greenPigeonhole.includes(scanPigeonholeId)) {
        setScanPigeonholeId("");
        setDialogOpen(true);
        setDialogMessage({
          title: "Error",
          content: `Scan wrong pigeonhole(${scanPigeonholeId}).`,
        });
        return;
      }

      try {
        const response = await axios.post(`${SERVER_URL}/store/update_store`, {
          item_code: dataSend[0].item_code,
          quantity: dataSend[0].quantity,
          store_no: selectedStoreNo,
          pigeonhole_id: scanPigeonholeId,
          user_id: userInfo.id,
        });

        handleSuccess(response.data);
        setGreenPigeonhole([]);
      } catch (error) {
        console.log("Error in pigeonhole input:", error);
        handleError();
      }
    } else if (event.key === "Backspace") {
      setScanPigeonholeId(scanPigeonholeId.slice(0, -1));
    } else if (
      event.key !== "Shift" &&
      event.key !== "Tab" &&
      event.key !== "CapsLock" &&
      event.key !== "Alt"
    ) {
      setScanPigeonholeId(scanPigeonholeId + event.key);
    }
  };

  const handleQuantitiesChange = (updatedQuantities) => {
    setDataSend(updatedQuantities);
  };

  const handleSuccess = () => {
    setDialogMessage({
      title: "Success",
      content: `Store updated successfully at ${scanPigeonholeId}.`,
    });
    setDialogOpen(true);
    setIsInputOne(true);
    setScanPigeonholeId("");
    setScanItemCode("");
    setItemData(null);
    setGreenPigeonhole([]);
    if (selectedStoreNo) {
      getListItem(selectedStoreNo);
    } else {
      console.log("Store number not selected");
    }
  };

  const handleError = () => {
    setDialogMessage({ title: "Error", content: "Error updating store." });
    setDialogOpen(true);
    setScanPigeonholeId("");
  };

  const handleActionClick = (item_code) => {
    setScanItemCode(item_code);
    setIsBtnActionClick(true);
  };

  const handleNextBtn = async () => {
    try {
      const response = await axios.post(`${SERVER_URL}/store/next_store`, {
        rack: storeData.leastItemsRack,
        side: storeData.leastItemsSide,
      });

      console.log(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  const handleCompleteBtn = async () => {
    axios
      .post(`${SERVER_URL}/api/fleet`, {
        task_type: "return",
        station: "stationA",
        rack: storeData.leastItemsRack,
        side: storeData.leastItemsSide,
      })
      .then(() => {
        handleStartClick();
      })
      .catch((err) => {
        console.error("Error in handleCompleteBtn:", err);
      });
  };

  return (
    <div>
      {displayStartButton && (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height="70vh"
        >
          <Button
            variant="contained"
            color="info"
            onClick={handleStartClick}
            style={{ padding: "10px 40px", fontWeight: "bold", fontSize: 15 }}
          >
            Start
          </Button>
        </Box>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Select Store Number</DialogTitle>
        <DialogContent>
          <List>
            {storeNumbers.map((store) => (
              <ListItem
                button
                key={store.no}
                onClick={() => handleStoreSelect(store.no)}
              >
                {store.no}
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} color="secondary">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      <Box display="flex" justifyContent="space-between" marginX={2}>
        {storeData && (
          <>
            <Box flex={1} marginRight={2}>
              <Layout
                data={storeData.layout}
                currRack={storeData.leastItemsRack}
                currSide={storeData.leastItemsSide}
                greenPigeonhole={greenPigeonhole}
              />
            </Box>
            <ItemDetails
              itemData={itemData}
              onQuantitiesChange={handleQuantitiesChange}
            />
            <ListComponent
              storeList={currStoreList}
              handleActionClick={handleActionClick}
            />
          </>
        )}
      </Box>

      <Box
        display="flex"
        justifyContent="flex-end"
        gap={2}
        position="fixed"
        bottom={16}
        right={16}
      >
        <Button variant="outlined" color="secondary" onClick={handleNextBtn}>
          Next
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleCompleteBtn}
        >
          Complete
        </Button>
      </Box>

      <input
        ref={item_codeRef}
        value={scanItemCode}
        type="text"
        onChange={() => {}}
        onKeyDown={handleItemCodeInput}
        style={{ display: "none" }}
      />
      <input
        ref={pigeonhole_idRef}
        value={scanPigeonholeId}
        type="text"
        onChange={() => {}}
        onKeyDown={handlePigeonholeIdInput}
        style={{ display: "none" }}
      />

      {/**display after scan pigeonhole */}
      {dialogMessage.title === "Success" ? (
        <CustomSnackbar
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          message={dialogMessage.content}
          severity={dialogMessage.title === "Success" ? "success" : "error"}
        />
      ) : (
        <CustomDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onComplete={() => setDialogOpen(false)}
          message={dialogMessage}
        />
      )}
    </div>
  );
};

export default Store;
